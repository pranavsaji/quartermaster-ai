import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { ApproveRequest, CreateProcurementRequest, IntentCertificateDto, PurchaseOrderDto } from "@qm/contracts";
import { approvalEvents, intentCertificates, inventoryItems, organizations, purchaseOrders, purchaseRequests, spendMandates, type DbOrTx } from "@qm/database";
import { computeCartHash, issueCertificate, reviewCodes } from "@qm/trustrail";
import type { AppContext } from "../../context";
import { conflict, notFound, unprocessable } from "../../errors";
import { appendAudit } from "../audit";
import { currentAccount, localDate, reserve } from "../budget";
import { recordFinding } from "../findings";
import { rowToMandate } from "../mandates";
import { cartFromRows, loadOrder, orderDtos, toCertificateDto } from "../orders";
import { evaluateOrder } from "../policy";
import { AgentRun } from "../agent/runtime";
import { interpretInstruction } from "../agent/llm";
import { getRequestDto } from "./dto";
import { refreshRequestStatus } from "./status";

export interface Actor {
  id: string;
  organizationId: string;
  ip?: string;
  userAgent?: string;
}

/** Creates a request and interprets the instruction (model with deterministic fallback). */
export async function createRequest(ctx: AppContext, actor: Actor, input: CreateProcurementRequest) {
  const now = ctx.now();
  const [org] = await ctx.db.select().from(organizations).where(eq(organizations.id, actor.organizationId));
  const [req] = await ctx.db
    .insert(purchaseRequests)
    .values({
      organizationId: actor.organizationId,
      createdBy: actor.id,
      status: "DRAFT",
      instruction: input.instruction,
      currency: input.currency,
      budgetLimitMinor: input.budget_limit_minor ?? null,
      requiredBy: input.required_by ?? null,
      allowAlternatives: input.allow_alternatives,
      demandMultiplier: input.demand_multiplier ?? null,
    })
    .returning();

  const run = await AgentRun.start(ctx.db, {
    organizationId: actor.organizationId,
    requestId: req!.id,
    kind: "INTERPRET",
    limits: { maxToolCalls: 4, maxResearchCalls: 0, deadlineMs: Math.min(20_000, ctx.config.agent.deadlineMs), tokenBudget: ctx.config.agent.tokenBudget },
  });
  const items = await ctx.db.select().from(inventoryItems).where(eq(inventoryItems.organizationId, actor.organizationId));
  const refs = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, category: i.category, keywords: i.keywords }));
  const interpreted = await run.tool(
    "intent.interpret",
    { length: input.instruction.length },
    () => interpretInstruction(ctx.openai, run, { instruction: input.instruction, inventory: refs, today: localDate(now, org!.timezone).date, now }),
    (r) => `${r.mode === "LLM" ? "Model" : "Deterministic"} interpretation: ${r.intent.inventory_item_ids.length} item(s), ${r.intent.demand_multiplier}× demand${r.note ? ` (${r.note})` : ""}.`,
  );
  run.aiMode = interpreted.mode;
  await run.finish("SUCCEEDED");

  // Explicit form fields override the interpretation; the interpretation never overrides them.
  const intent = {
    ...interpreted.intent,
    demand_multiplier: input.demand_multiplier ?? interpreted.intent.demand_multiplier,
    budget_limit_minor: input.budget_limit_minor ?? interpreted.intent.budget_limit_minor,
    required_by: input.required_by ?? interpreted.intent.required_by,
    ai_mode: interpreted.mode,
  };
  await ctx.db.update(purchaseRequests).set({ intent, aiMode: interpreted.mode, updatedAt: ctx.now() }).where(eq(purchaseRequests.id, req!.id));
  await appendAudit(ctx.db, {
    organizationId: actor.organizationId,
    action: "procurement.request_created",
    actorType: "USER",
    actorId: actor.id,
    entityType: "purchase_request",
    entityId: req!.id,
    data: { instruction: input.instruction, intent },
  });
  return getRequestDto(ctx.db, actor.organizationId, req!.id);
}

/** Re-runs TrustRail on every open proposal (e.g. after a mandate change). */
export async function evaluateRequest(ctx: AppContext, actor: Actor, requestId: string) {
  const [req] = await ctx.db.select().from(purchaseRequests).where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.organizationId, actor.organizationId)));
  if (!req) throw notFound("Procurement request");
  const open = await ctx.db.select().from(purchaseOrders).where(and(eq(purchaseOrders.requestId, requestId), inArray(purchaseOrders.status, ["PROPOSED", "BLOCKED"])));
  for (const po of open) {
    await ctx.db.transaction(async (tx) => {
      const { po: locked, items } = await loadOrder(tx, actor.organizationId, po.id, true);
      const ev = await evaluateOrder(tx, actor.organizationId, locked, items, { stage: "EVALUATE", now: ctx.now(), marketMaxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours });
      const next = ev.result.decision === "BLOCK" ? "BLOCKED" : "PROPOSED";
      if (next !== locked.status) await tx.update(purchaseOrders).set({ status: next, updatedAt: ctx.now() }).where(eq(purchaseOrders.id, locked.id));
      await appendAudit(tx, {
        organizationId: actor.organizationId,
        action: "trustrail.cart_reevaluated",
        actorType: "USER",
        actorId: actor.id,
        entityType: "purchase_order",
        entityId: locked.id,
        data: { decision: ev.result.decision, violations: ev.result.violations.map((v) => v.code), policy_decision_id: ev.decisionId },
      });
    });
  }
  await refreshRequestStatus(ctx.db, requestId, ctx.now());
  return getRequestDto(ctx.db, actor.organizationId, requestId);
}

/**
 * Owner approval of one exact cart. In a single transaction: re-verify the cart hash the owner
 * saw, re-run TrustRail with the budget row locked, require acknowledgement of every review
 * item, record the approval, sign the Intent Certificate and reserve the budget.
 */
export async function approveProposal(
  ctx: AppContext,
  actor: Actor,
  requestId: string,
  input: ApproveRequest,
): Promise<{ purchase_order: PurchaseOrderDto; certificate: IntentCertificateDto }> {
  const result = await withDeferredFailures(ctx, () => ctx.db.transaction(async (tx) => {
    const now = ctx.now();
    // Hold the active mandate (shared) for the whole approval, so the version evaluated is the
    // version signed and a concurrent mandate update cannot slip between them.
    const [lockedMandate] = await tx
      .select()
      .from(spendMandates)
      .where(and(eq(spendMandates.organizationId, actor.organizationId), eq(spendMandates.status, "ACTIVE")))
      .for("share");
    if (!lockedMandate) throw conflict("MANDATE_INACTIVE", "No active Spend Mandate.");
    const { po, items } = await loadOrder(tx, actor.organizationId, input.purchase_order_id, true);
    if (po.requestId !== requestId) throw notFound("Proposal for this request");
    if (po.status !== "PROPOSED") throw conflict("PROPOSAL_NOT_APPROVABLE", `Proposal is ${po.status}.`);

    const liveHash = computeCartHash(cartFromRows(po, items));
    if (liveHash !== po.cartHash) {
      throw new DeferredFailure(conflict("CART_CHANGED", "The cart changed after it was proposed. Re-run research."), (db) =>
        recordFinding(db, {
          organizationId: actor.organizationId,
          type: "CART_TAMPERING",
          severity: "CRITICAL",
          title: "Stored cart no longer matches its recorded hash",
          description: "Line items or totals were altered after the proposal was created. Approval refused.",
          sourceKind: "purchase_order",
          sourceId: po.id,
          evidence: { recorded: po.cartHash, recomputed: liveHash },
          relatedPurchaseOrderId: po.id,
          relatedRequestId: requestId,
        }).then(() => undefined),
      );
    }
    if (input.cart_hash !== po.cartHash) throw conflict("CART_CHANGED", "The cart you reviewed is not the current cart. Reload and review again.", { current_cart_hash: po.cartHash });

    const ev = await evaluateOrder(tx, actor.organizationId, po, items, { stage: "APPROVE", now, lockBudget: true, marketMaxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours });
    if (ev.result.decision === "BLOCK") {
      const violations = ev.result.violations;
      throw new DeferredFailure(unprocessable("POLICY_BLOCKED", "TrustRail blocks this purchase.", { violations }), async (db) => {
        // Only a still-PROPOSED order is marked blocked: a concurrent approval may have succeeded.
        const changed = await db
          .update(purchaseOrders)
          .set({ status: "BLOCKED", updatedAt: ctx.now() })
          .where(and(eq(purchaseOrders.id, po.id), eq(purchaseOrders.status, "PROPOSED")))
          .returning({ id: purchaseOrders.id });
        if (changed.length === 0) return;
        await recordFinding(db, {
          organizationId: actor.organizationId,
          type: "POLICY_VIOLATION",
          severity: "HIGH",
          title: "Approval attempt blocked by TrustRail",
          description: violations.filter((v) => v.severity === "BLOCK").map((v) => v.message).join(" "),
          sourceKind: "purchase_order",
          sourceId: po.id,
          evidence: { violations, stage: "APPROVE" },
          relatedPurchaseOrderId: po.id,
          relatedRequestId: requestId,
        });
        await appendAudit(db, { organizationId: actor.organizationId, action: "trustrail.approval_blocked", actorType: "USER", actorId: actor.id, entityType: "purchase_order", entityId: po.id, data: { violations: violations.map((v) => v.code) } });
        await refreshRequestStatus(db, requestId, ctx.now());
      });
    }
    const required = reviewCodes(ev.result);
    const missing = required.filter((c) => !input.acknowledged_review_codes.includes(c));
    if (missing.length) throw unprocessable("REVIEW_ACKNOWLEDGEMENT_REQUIRED", "Acknowledge every review item before approving.", { missing });

    const mandate = rowToMandate(lockedMandate);
    if (ev.result.mandate_version !== mandate.version) throw conflict("MANDATE_CHANGED", "The Spend Mandate changed during approval. Review again.");

    const [approval] = await tx
      .insert(approvalEvents)
      .values({
        organizationId: actor.organizationId,
        purchaseOrderId: po.id,
        userId: actor.id,
        action: "APPROVED",
        cartHash: po.cartHash,
        acknowledgedReviewCodes: required,
        note: input.note ?? null,
        ip: actor.ip ?? null,
        userAgent: actor.userAgent?.slice(0, 300) ?? null,
        createdAt: now,
      })
      .returning();

    const intentId = randomUUID();
    const signed = issueCertificate(
      {
        intent_id: intentId,
        organization_id: actor.organizationId,
        buyer_id: actor.id,
        purchase_order_id: po.id,
        supplier_id: po.supplierId,
        cart_hash: po.cartHash,
        mandate_id: mandate.id,
        mandate_version: mandate.version,
        policy_decision_id: ev.decisionId,
        currency: po.currency,
        approved_amount_minor: po.totalMinor,
        approved_at: now,
        ttl_minutes: mandate.certificate_ttl_minutes,
      },
      ctx.signingKey,
    );

    const [org] = await tx.select().from(organizations).where(eq(organizations.id, actor.organizationId));
    const account = await currentAccount(tx, { organizationId: actor.organizationId, timeZone: org!.timezone, currency: org!.currency, weeklyLimitMinor: mandate.weekly_budget_minor, now, lock: true });

    const [cert] = await tx
      .insert(intentCertificates)
      .values({
        id: intentId,
        organizationId: actor.organizationId,
        purchaseOrderId: po.id,
        buyerId: actor.id,
        policyDecisionId: ev.decisionId,
        approvalEventId: approval!.id,
        payload: signed.payload as unknown as Record<string, unknown>,
        signature: signed.signature,
        keyId: signed.key_id,
        status: "ACTIVE",
        issuedAt: now,
        expiresAt: new Date(signed.payload.expires_at),
      })
      .returning();
    const reservation = await reserve(tx, account, { organizationId: actor.organizationId, intentId, purchaseOrderId: po.id, amountMinor: po.totalMinor });

    await tx.update(purchaseOrders).set({ status: "APPROVED", updatedAt: now }).where(eq(purchaseOrders.id, po.id));
    await tx.update(purchaseRequests).set({ approvedAt: now }).where(eq(purchaseRequests.id, requestId));
    await refreshRequestStatus(tx, requestId, now);

    const base = { organizationId: actor.organizationId, actorType: "USER" as const, actorId: actor.id };
    await appendAudit(tx, { ...base, action: "approval.recorded", entityType: "purchase_order", entityId: po.id, data: { cart_hash: po.cartHash, total_minor: po.totalMinor, acknowledged: required, policy_decision_id: ev.decisionId } });
    await appendAudit(tx, { ...base, action: "certificate.issued", entityType: "intent_certificate", entityId: intentId, data: { key_id: signed.key_id, expires_at: signed.payload.expires_at, amount_minor: po.totalMinor, mandate_version: mandate.version } });
    await appendAudit(tx, { ...base, action: "budget.reserved", entityType: "budget_reservation", entityId: reservation.id, data: { amount_minor: po.totalMinor, intent_id: intentId, period_start: account.periodStart } });

    const [dto] = await orderDtos(tx, actor.organizationId, [{ ...po, status: "APPROVED" }]);
    return { purchase_order: dto!, certificate: toCertificateDto(cert!) };
  }));
  return result;
}

/**
 * An error raised inside a transaction whose evidence (findings, audit, status) must survive the
 * rollback. The follow-up runs in its own transaction after the original one has rolled back.
 */
export class DeferredFailure extends Error {
  constructor(
    readonly error: Error,
    readonly after: (db: DbOrTx) => Promise<void>,
  ) {
    super(error.message);
    this.name = "DeferredFailure";
  }
}

export async function withDeferredFailures<T>(ctx: AppContext, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof DeferredFailure) {
      try {
        await ctx.db.transaction((tx) => err.after(tx));
      } catch (followUp) {
        ctx.log.error({ err: followUp }, "failed to persist evidence for a refused operation");
      }
      throw err.error;
    }
    throw err;
  }
}

export async function rejectRequest(ctx: AppContext, actor: Actor, requestId: string, reason: string) {
  await ctx.db.transaction(async (tx) => {
    const [req] = await tx.select().from(purchaseRequests).where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.organizationId, actor.organizationId))).for("update");
    if (!req) throw notFound("Procurement request");
    const open = await tx.select().from(purchaseOrders).where(and(eq(purchaseOrders.requestId, requestId), eq(purchaseOrders.status, "PROPOSED")));
    if (open.length === 0 && !["DRAFT", "BLOCKED", "FAILED"].includes(req.status)) throw conflict("NOTHING_TO_REJECT", "There is no open proposal to reject.");
    for (const po of open) {
      await tx.update(purchaseOrders).set({ status: "REJECTED", updatedAt: ctx.now() }).where(eq(purchaseOrders.id, po.id));
      await tx.insert(approvalEvents).values({ organizationId: actor.organizationId, purchaseOrderId: po.id, userId: actor.id, action: "REJECTED", cartHash: po.cartHash, note: reason, ip: actor.ip ?? null, userAgent: actor.userAgent?.slice(0, 300) ?? null });
    }
    if (open.length === 0) await tx.update(purchaseRequests).set({ status: "REJECTED", updatedAt: ctx.now() }).where(eq(purchaseRequests.id, requestId));
    else await refreshRequestStatus(tx, requestId, ctx.now());
    await appendAudit(tx, { organizationId: actor.organizationId, action: "procurement.rejected", actorType: "USER", actorId: actor.id, entityType: "purchase_request", entityId: requestId, data: { reason, proposals: open.map((p) => p.id) } });
  });
  return getRequestDto(ctx.db, actor.organizationId, requestId);
}
