import { and, desc, eq, inArray } from "drizzle-orm";
import type { AnalyzeInvoiceRequest, InvoiceDto, Severity } from "@qm/contracts";
import { invoiceMatches, invoices, paymentAttempts, purchaseOrderItems, purchaseOrders, suppliers, type DbOrTx } from "@qm/database";
import { analyzeInvoice, normalizeInvoiceNumber, type InvoiceLine } from "@qm/quartermaster";
import { z } from "zod";
import type { AppContext } from "../context";
import { notFound } from "../errors";
import { appendAudit } from "./audit";
import { recordFinding } from "./findings";
import { AfterCommit, type Actor } from "./common";

type InvoiceRow = typeof invoices.$inferSelect;

function toDto(r: InvoiceRow, matches: (typeof invoiceMatches.$inferSelect)[]): InvoiceDto {
  return {
    id: r.id,
    supplier_id: r.supplierId,
    purchase_order_id: r.purchaseOrderId,
    invoice_number: r.invoiceNumber,
    invoice_date: r.invoiceDate,
    currency: r.currency,
    total_minor: r.totalMinor,
    status: r.status,
    settlement_allowed: r.settlementAllowed,
    matches: matches.map((m) => ({
      check: m.check,
      passed: m.passed,
      severity: (m.severity as Severity | null) ?? null,
      detail: m.detail,
    })),
    created_at: r.createdAt.toISOString(),
  };
}

const StoredInvoiceLines = z.array(
  z.object({
    sku: z.string().nullable().optional(),
    description: z.string(),
    quantity: z.number().int(),
    unit_price_minor: z.number().int(),
    line_total_minor: z.number().int(),
  }),
);

/** Stored invoice lines, validated; malformed history is ignored rather than trusted. */
function storedLines(raw: unknown): InvoiceLine[] | undefined {
  const parsed = StoredInvoiceLines.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export async function listInvoices(db: DbOrTx, organizationId: string): Promise<InvoiceDto[]> {
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId))
    .orderBy(desc(invoices.createdAt))
    .limit(200);
  if (rows.length === 0) return [];
  const matches = await db
    .select()
    .from(invoiceMatches)
    .where(
      inArray(
        invoiceMatches.invoiceId,
        rows.map((r) => r.id),
      ),
    );
  const byInvoice = new Map<string, (typeof matches)[number][]>();
  for (const m of matches) byInvoice.set(m.invoiceId, [...(byInvoice.get(m.invoiceId) ?? []), m]);
  return rows.map((r) => toDto(r, byInvoice.get(r.id) ?? []));
}

/**
 * Records and reconciles a supplier invoice. Every submission is stored (duplicates included,
 * as evidence), but at most one invoice per purchase order can ever be marked settled, and no
 * invoice can trigger a payment.
 */
export async function analyzeAndRecordInvoice(ctx: AppContext, actor: Actor, input: AnalyzeInvoiceRequest): Promise<InvoiceDto> {
  const after = new AfterCommit();
  const result = await ctx.db.transaction(async (tx) => {
    const [supplier] = await tx
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, input.supplier_id), eq(suppliers.organizationId, actor.organizationId)));
    if (!supplier) throw notFound("Supplier");

    let poView = null;
    if (input.purchase_order_id) {
      const [po] = await tx
        .select()
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, input.purchase_order_id), eq(purchaseOrders.organizationId, actor.organizationId)))
        .for("update");
      if (po) {
        const items = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));
        const [payment] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.purchaseOrderId, po.id));
        poView = {
          id: po.id,
          supplier_id: po.supplierId,
          currency: po.currency,
          total_minor: po.totalMinor,
          status: po.status,
          payment_completed: payment !== undefined && ["COMPLETED", "PARTIALLY_REFUNDED"].includes(payment.status),
          items: items.map((i) => ({
            kind: i.kind,
            sku: i.sku,
            quantity: i.quantity,
            unit_price_minor: i.unitPriceMinor,
            line_total_minor: i.lineTotalMinor,
          })),
        };
      }
    }

    const existing = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.organizationId, actor.organizationId), eq(invoices.supplierId, input.supplier_id)));
    const analysis = analyzeInvoice(
      { ...input, purchase_order_id: input.purchase_order_id ?? null },
      poView,
      existing.map((e) => ({
        id: e.id,
        supplier_id: e.supplierId,
        invoice_number: e.invoiceNumber,
        purchase_order_id: e.purchaseOrderId,
        total_minor: e.totalMinor,
        content_hash: e.contentHash,
        status: e.status,
        // Earlier partial invoices count towards the order, so the one for the remainder matches.
        lines: storedLines(e.lines),
      })),
    );

    const [row] = await tx
      .insert(invoices)
      .values({
        organizationId: actor.organizationId,
        supplierId: input.supplier_id,
        purchaseOrderId: poView?.id ?? null,
        invoiceNumber: input.invoice_number,
        invoiceNumberNormalized: normalizeInvoiceNumber(input.invoice_number),
        invoiceDate: input.invoice_date,
        currency: input.currency,
        lines: input.lines,
        totalMinor: input.total_minor,
        notes: input.notes ?? null,
        contentHash: analysis.content_hash,
        status: analysis.status,
        settlementAllowed: analysis.settlement_allowed,
        createdBy: actor.id,
      })
      .returning();
    const matches = analysis.checks.length
      ? await tx
          .insert(invoiceMatches)
          .values(
            analysis.checks.map((c) => ({ invoiceId: row!.id, check: c.check, passed: c.passed, severity: c.severity, detail: c.detail })),
          )
          .returning()
      : [];

    if (analysis.status === "DUPLICATE" || analysis.status === "DISCREPANCY") {
      await recordFinding(tx, {
        organizationId: actor.organizationId,
        type: analysis.status === "DUPLICATE" ? "DUPLICATE_INVOICE" : "INVOICE_DISCREPANCY",
        severity: analysis.status === "DUPLICATE" ? "HIGH" : "MEDIUM",
        title:
          analysis.status === "DUPLICATE"
            ? `Potential duplicate invoice ${input.invoice_number} from ${supplier.name}`
            : `Invoice ${input.invoice_number} does not match its order`,
        description: analysis.checks
          .filter((c) => !c.passed)
          .map((c) => c.detail)
          .join(" "),
        sourceKind: "invoice",
        sourceId: row!.id,
        evidence: { duplicate_of: analysis.duplicate_of, failed_checks: analysis.checks.filter((c) => !c.passed).map((c) => c.check) },
        relatedPurchaseOrderId: poView?.id ?? null,
      });
      after.add(() =>
        ctx.notifier.send({
          kind: "INVOICE_FLAGGED",
          organization_id: actor.organizationId,
          title: `Invoice ${input.invoice_number} flagged`,
          summary: `${analysis.status.toLowerCase()} — settlement withheld`,
          link_path: "/orders",
        }),
      );
    }
    if (analysis.injection?.suspicious) {
      await recordFinding(tx, {
        organizationId: actor.organizationId,
        type: "PROMPT_INJECTION",
        severity: analysis.injection.severity,
        title: `Embedded instructions in invoice ${input.invoice_number}`,
        description: "Invoice text contained instructions aimed at an automated agent. The text was treated as untrusted data.",
        sourceKind: "invoice",
        sourceId: row!.id,
        evidence: { signals: analysis.injection.signals },
        relatedPurchaseOrderId: poView?.id ?? null,
      });
    }
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "invoice.analyzed",
      actorType: "USER",
      actorId: actor.id,
      entityType: "invoice",
      entityId: row!.id,
      data: {
        invoice_number: input.invoice_number,
        status: analysis.status,
        settlement_allowed: analysis.settlement_allowed,
        total_minor: input.total_minor,
      },
    });
    return toDto(row!, matches);
  });
  after.flush(ctx);
  return result;
}
