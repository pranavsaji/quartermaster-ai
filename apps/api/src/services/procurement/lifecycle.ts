import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { ApproveRequest, CreateProcurementRequest, IntentCertificateDto, PurchaseOrderDto } from "@qm/contracts";
import {
  approvalEvents,
  intentCertificates,
  inventoryItems,
  organizations,
  purchaseOrders,
  purchaseRequests,
  spendMandates,
  type DbOrTx,
} from "@qm/database";
import { computeCartHash, issueCertificate, reviewCodes, type SpendMandate } from "@qm/trustrail";
import type { AppContext } from "../../context";
import { conflict, notFound, unprocessable } from "../../errors";
import { appendAudit } from "../audit";
import { DeferredFailure, withDeferredFailures, type Actor } from "../common";
import { currentAccount, localDate, reserve } from "../budget";
import { recordFinding } from "../findings";
import { rowToMandate } from "../mandates";
import { setOrderStatus } from "../order-status";
import { cartFromRows, loadOrder, orderDtos, toCertificateDto, type PurchaseOrderItemRow, type PurchaseOrderRow } from "../orders";
import { assessOrder, evaluateOrder, recordDecision, type PolicyEvaluation } from "../policy";
import { AgentRun } from "../agent/runtime";
import { interpretInstruction } from "../agent/llm";
import { getRequestDto } from "./dto";
import { isApprovableRequestStatus, refreshRequestStatus } from "./status";

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
    log: ctx.log,
    limits: {
      maxToolCalls: 4,
      maxResearchCalls: 0,
      deadlineMs: Math.min(20_000, ctx.config.agent.deadlineMs),
      tokenBudget: ctx.config.agent.tokenBudget,
    },
  });
  const items = await ctx.db.select().from(inventoryItems).where(eq(inventoryItems.organizationId, actor.organizationId));
  const refs = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, category: i.category, keywords: i.keywords }));
  const interpreted = await run.tool(
    "intent.interpret",
    { length: input.instruction.length },
    () =>
      interpretInstruction(ctx.openai, run, {
        instruction: input.instruction,
        inventory: refs,
        today: localDate(now, org!.timezone).date,
        now,
        timeZone: org!.timezone,
      }),
    (r) =>
      `${r.mode === "LLM" ? "Model" : "Deterministic"} interpretation: ${r.intent.inventory_item_ids.length} item(s), ${r.intent.demand_multiplier}× demand${r.note ? ` (${r.note})` : ""}.`,
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
  // The request row exists before interpretation so the agent run can record its steps against
  // it; the interpreted intent and the audit entry are written together.
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(purchaseRequests)
      .set({ intent, aiMode: interpreted.mode, updatedAt: ctx.now() })
      .where(eq(purchaseRequests.id, req!.id));
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "procurement.request_created",
      actorType: "USER",
      actorId: actor.id,
      entityType: "purchase_request",
      entityId: req!.id,
      data: { instruction: input.instruction, intent },
    });
  });
  return getRequestDto(ctx.db, actor.organizationId, req!.id);
}

/** Re-runs TrustRail on every open proposal (e.g. after a mandate change). */
export async function evaluateRequest(ctx: AppContext, actor: Actor, requestId: string) {
  const [req] = await ctx.db
    .select()
    .from(purchaseRequests)
    .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.organizationId, actor.organizationId)));
  if (!req) throw notFound("Procurement request");
  const open = await ctx.db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.requestId, requestId), inArray(purchaseOrders.status, ["PROPOSED", "BLOCKED"])));
  for (const po of open) {
    await ctx.db.transaction(async (tx) => {
      const { po: locked, items } = await loadOrder(tx, actor.organizationId, po.id, true);
      // Re-check under the lock: an approval may have committed since the list was read.
      if (locked.status !== "PROPOSED" && locked.status !== "BLOCKED") return;
      const ev = await evaluateOrder(tx, actor.organizationId, locked, items, {
        stage: "EVALUATE",
        now: ctx.now(),
        marketMaxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours,
      });
      const next = ev.result.decision === "BLOCK" ? "BLOCKED" : "PROPOSED";
      if (next !== locked.status) await setOrderStatus(tx, locked.id, [locked.status], next, ctx.now());
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

type MandateRow = typeof spendMandates.$inferSelect;
type OrderRows = Awaited<ReturnType<typeof loadOrder>>;
type RecordedEvaluation = PolicyEvaluation & { decisionId: string };

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
  return withDeferredFailures(ctx, () =>
    ctx.db.transaction(async (tx) => {
      const now = ctx.now();
      const mandateRow = await lockActiveMandate(tx, actor.organizationId);
      const { po, items } = await lockApprovableProposal(tx, actor, requestId, input.purchase_order_id);
      verifyReviewedCart(actor, requestId, { po, items }, input.cart_hash);
      const ev = await evaluateForApproval(ctx, tx, actor, requestId, po, items, now);
      const required = reviewCodes(ev.result);
      const missing = required.filter((c) => !input.acknowledged_review_codes.includes(c));
      if (missing.length)
        throw unprocessable("REVIEW_ACKNOWLEDGEMENT_REQUIRED", "Acknowledge every review item before approving.", { missing });
      const mandate = rowToMandate(mandateRow);
      if (ev.result.mandate_version !== mandate.version)
        throw conflict("MANDATE_CHANGED", "The Spend Mandate changed during approval. Review again.");
      return commitApproval(ctx, tx, { actor, requestId, po, mandate, decisionId: ev.decisionId, acknowledged: required, input, now });
    }),
  );
}

/**
 * Holds the active mandate (shared) for the whole approval, so the version evaluated is the
 * version signed and a concurrent mandate update cannot slip between them.
 */
async function lockActiveMandate(tx: DbOrTx, organizationId: string): Promise<MandateRow> {
  const [row] = await tx
    .select()
    .from(spendMandates)
    .where(and(eq(spendMandates.organizationId, organizationId), eq(spendMandates.status, "ACTIVE")))
    .for("share");
  if (!row) throw conflict("MANDATE_INACTIVE", "No active Spend Mandate.");
  return row;
}

/**
 * Locks the request, then the proposal (lock order: mandate → request → order). The request
 * row serialises approval with research and rejection: research supersedes proposals, so
 * approval never runs alongside it, and a request whose research failed or that was closed
 * cannot have a stray proposal approved.
 */
async function lockApprovableProposal(tx: DbOrTx, actor: Actor, requestId: string, purchaseOrderId: string): Promise<OrderRows> {
  const [lockedRequest] = await tx
    .select({ status: purchaseRequests.status })
    .from(purchaseRequests)
    .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.organizationId, actor.organizationId)))
    .for("update");
  if (!lockedRequest) throw notFound("Procurement request");
  if (lockedRequest.status === "RESEARCHING")
    throw conflict("RESEARCH_IN_PROGRESS", "Research is running for this request; wait for it to finish.");
  const order = await loadOrder(tx, actor.organizationId, purchaseOrderId, true);
  if (order.po.requestId !== requestId) throw notFound("Proposal for this request");
  if (order.po.status !== "PROPOSED") throw conflict("PROPOSAL_NOT_APPROVABLE", `Proposal is ${order.po.status}.`);
  if (!isApprovableRequestStatus(lockedRequest.status))
    throw conflict("REQUEST_NOT_APPROVABLE", "This request is not ready for approval.", { request_status: lockedRequest.status });
  return order;
}

/**
 * The stored cart must still match its recorded hash (tampering is recorded as a finding that
 * survives the rollback) and must be the cart the owner reviewed.
 */
function verifyReviewedCart(actor: Actor, requestId: string, { po, items }: OrderRows, reviewedHash: string): void {
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
  if (reviewedHash !== po.cartHash)
    throw conflict("CART_CHANGED", "The cart you reviewed is not the current cart. Reload and review again.", {
      current_cart_hash: po.cartHash,
    });
}

/**
 * Runs TrustRail at approval with the budget row locked. An allowed decision is recorded in the
 * approval's transaction; a BLOCK refuses the approval with a DeferredFailure whose follow-up
 * records the decision (the in-transaction row would be rolled back), marks the proposal
 * BLOCKED and leaves a finding and an audit entry.
 */
async function evaluateForApproval(
  ctx: AppContext,
  tx: DbOrTx,
  actor: Actor,
  requestId: string,
  po: PurchaseOrderRow,
  items: PurchaseOrderItemRow[],
  now: Date,
): Promise<RecordedEvaluation> {
  const ev = await assessOrder(tx, actor.organizationId, po, items, {
    stage: "APPROVE",
    now,
    lockBudget: true,
    marketMaxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours,
  });
  if (ev.result.decision === "BLOCK") throw approvalBlocked(ctx, actor, requestId, po, ev);
  return { ...ev, decisionId: await recordDecision(tx, actor.organizationId, ev) };
}

function approvalBlocked(ctx: AppContext, actor: Actor, requestId: string, po: PurchaseOrderRow, ev: PolicyEvaluation): DeferredFailure {
  const violations = ev.result.violations;
  return new DeferredFailure(unprocessable("POLICY_BLOCKED", "TrustRail blocks this purchase.", { violations }), async (db) => {
    // The decision is evidence of the refused attempt whatever happened to the order since.
    const decisionId = await recordDecision(db, actor.organizationId, ev);
    // Only a still-PROPOSED order is marked blocked: a concurrent approval may have succeeded.
    if (!(await setOrderStatus(db, po.id, ["PROPOSED"], "BLOCKED", ctx.now()))) return;
    await recordFinding(db, {
      organizationId: actor.organizationId,
      type: "POLICY_VIOLATION",
      severity: "HIGH",
      title: "Approval attempt blocked by TrustRail",
      description: violations
        .filter((v) => v.severity === "BLOCK")
        .map((v) => v.message)
        .join(" "),
      sourceKind: "purchase_order",
      sourceId: po.id,
      evidence: { violations, stage: "APPROVE" },
      relatedPurchaseOrderId: po.id,
      relatedRequestId: requestId,
    });
    await appendAudit(db, {
      organizationId: actor.organizationId,
      action: "trustrail.approval_blocked",
      actorType: "USER",
      actorId: actor.id,
      entityType: "purchase_order",
      entityId: po.id,
      data: { violations: violations.map((v) => v.code), policy_decision_id: decisionId, input_digest: ev.result.input_digest },
    });
  });
}

/** Records the approval, signs the Intent Certificate, reserves the budget and audits all three. */
async function commitApproval(
  ctx: AppContext,
  tx: DbOrTx,
  args: {
    actor: Actor;
    requestId: string;
    po: PurchaseOrderRow;
    mandate: SpendMandate;
    decisionId: string;
    acknowledged: string[];
    input: ApproveRequest;
    now: Date;
  },
): Promise<{ purchase_order: PurchaseOrderDto; certificate: IntentCertificateDto }> {
  const { actor, requestId, po, mandate, decisionId, acknowledged, input, now } = args;
  const [approval] = await tx
    .insert(approvalEvents)
    .values({
      organizationId: actor.organizationId,
      purchaseOrderId: po.id,
      userId: actor.id,
      action: "APPROVED",
      cartHash: po.cartHash,
      acknowledgedReviewCodes: acknowledged,
      note: input.note ?? null,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent?.slice(0, 300) ?? null,
      createdAt: now,
    })
    .returning();

  const [org] = await tx.select().from(organizations).where(eq(organizations.id, actor.organizationId));
  const account = await currentAccount(tx, {
    organizationId: actor.organizationId,
    timeZone: org!.timezone,
    currency: org!.currency,
    weeklyLimitMinor: mandate.weekly_budget_minor,
    now,
    lock: true,
  });
  const { cert, signed } = await issueIntentCertificate(ctx, tx, { actor, po, mandate, decisionId, approvalEventId: approval!.id, now });
  const reservation = await reserve(tx, account, {
    organizationId: actor.organizationId,
    intentId: cert.id,
    purchaseOrderId: po.id,
    amountMinor: po.totalMinor,
    now,
  });

  await setOrderStatus(tx, po.id, ["PROPOSED"], "APPROVED", now);
  await tx.update(purchaseRequests).set({ approvedAt: now }).where(eq(purchaseRequests.id, requestId));

  const base = { organizationId: actor.organizationId, actorType: "USER" as const, actorId: actor.id };
  await appendAudit(tx, {
    ...base,
    action: "approval.recorded",
    entityType: "purchase_order",
    entityId: po.id,
    data: { cart_hash: po.cartHash, total_minor: po.totalMinor, acknowledged, policy_decision_id: decisionId },
  });
  await appendAudit(tx, {
    ...base,
    action: "certificate.issued",
    entityType: "intent_certificate",
    entityId: cert.id,
    data: {
      key_id: signed.key_id,
      expires_at: signed.payload.expires_at,
      amount_minor: po.totalMinor,
      mandate_version: mandate.version,
    },
  });
  await appendAudit(tx, {
    ...base,
    action: "budget.reserved",
    entityType: "budget_reservation",
    entityId: reservation.id,
    data: { amount_minor: po.totalMinor, intent_id: cert.id, period_start: account.periodStart },
  });

  const [dto] = await orderDtos(tx, actor.organizationId, [{ ...po, status: "APPROVED" }]);
  return { purchase_order: dto!, certificate: toCertificateDto(cert) };
}

/** Signs the Intent Certificate binding this exact cart, amount, mandate version and decision. */
async function issueIntentCertificate(
  ctx: AppContext,
  tx: DbOrTx,
  args: { actor: Actor; po: PurchaseOrderRow; mandate: SpendMandate; decisionId: string; approvalEventId: string; now: Date },
) {
  const { actor, po, mandate, decisionId, now } = args;
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
      policy_decision_id: decisionId,
      currency: po.currency,
      approved_amount_minor: po.totalMinor,
      approved_at: now,
      ttl_minutes: mandate.certificate_ttl_minutes,
    },
    ctx.signingKey,
  );
  const [cert] = await tx
    .insert(intentCertificates)
    .values({
      id: intentId,
      organizationId: actor.organizationId,
      purchaseOrderId: po.id,
      buyerId: actor.id,
      policyDecisionId: decisionId,
      approvalEventId: args.approvalEventId,
      payload: signed.payload as unknown as Record<string, unknown>,
      signature: signed.signature,
      keyId: signed.key_id,
      status: "ACTIVE",
      issuedAt: now,
      expiresAt: new Date(signed.payload.expires_at),
    })
    .returning();
  return { cert: cert!, signed };
}

export async function rejectRequest(ctx: AppContext, actor: Actor, requestId: string, reason: string, purchaseOrderId?: string) {
  await ctx.db.transaction(async (tx) => {
    const [req] = await tx
      .select()
      .from(purchaseRequests)
      .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.organizationId, actor.organizationId)))
      .for("update");
    if (!req) throw notFound("Procurement request");
    const scope = and(
      eq(purchaseOrders.requestId, requestId),
      eq(purchaseOrders.status, "PROPOSED"),
      purchaseOrderId ? eq(purchaseOrders.id, purchaseOrderId) : undefined,
    );
    const open = await tx.select().from(purchaseOrders).where(scope).for("update");
    if (purchaseOrderId && open.length === 0) throw conflict("PROPOSAL_NOT_OPEN", "That proposal is no longer open for rejection.");
    if (open.length === 0 && !["DRAFT", "BLOCKED", "FAILED"].includes(req.status))
      throw conflict("NOTHING_TO_REJECT", "There is no open proposal to reject.");
    for (const po of open) {
      await tx.update(purchaseOrders).set({ status: "REJECTED", updatedAt: ctx.now() }).where(eq(purchaseOrders.id, po.id));
      await tx.insert(approvalEvents).values({
        organizationId: actor.organizationId,
        purchaseOrderId: po.id,
        userId: actor.id,
        action: "REJECTED",
        cartHash: po.cartHash,
        note: reason,
        ip: actor.ip ?? null,
        userAgent: actor.userAgent?.slice(0, 300) ?? null,
      });
    }
    if (open.length === 0)
      await tx.update(purchaseRequests).set({ status: "REJECTED", updatedAt: ctx.now() }).where(eq(purchaseRequests.id, requestId));
    else await refreshRequestStatus(tx, requestId, ctx.now());
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "procurement.rejected",
      actorType: "USER",
      actorId: actor.id,
      entityType: "purchase_request",
      entityId: requestId,
      data: { reason, proposals: open.map((p) => p.id) },
    });
  });
  return getRequestDto(ctx.db, actor.organizationId, requestId);
}
