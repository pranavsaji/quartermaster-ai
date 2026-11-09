import type { InvoiceDto } from "@qm/contracts";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { Icons } from "@/components/shell/icons";
import { humanize, money } from "@/lib/format";
import { INVOICE_STATUS_TONES, SEVERITY_TONES } from "@/lib/labels";

/** Three-way match result for an analysed invoice, and whether settlement may proceed. */
export function InvoiceResult({ invoice }: { invoice: InvoiceDto }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        invoice.settlement_allowed ? "border-allow-line bg-allow-soft/40" : "border-block-line bg-block-soft/40",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13.5px] font-semibold text-ink">
          Invoice <span className="font-mono">{invoice.invoice_number}</span>
        </p>
        <StatusBadge status={invoice.status} tones={INVOICE_STATUS_TONES} kind="Invoice" />
        <Badge tone={invoice.settlement_allowed ? "allow" : "block"} dot size="md" label={`Settlement ${invoice.settlement_allowed ? "allowed" : "blocked"}`}>
          {invoice.settlement_allowed ? "Settlement allowed" : "Settlement blocked"}
        </Badge>
        <span className="tnum ml-auto text-[14px] font-semibold text-ink">{money(invoice.total_minor, invoice.currency)}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {invoice.matches.map((m) => (
          <li key={m.check} className="flex gap-2 text-[13px]">
            {m.passed ? (
              <Icons.check className="mt-0.5 size-3.5 text-allow" strokeWidth={2.4} />
            ) : (
              <Icons.x className="mt-0.5 size-3.5 text-block" strokeWidth={2.4} />
            )}
            <span className="min-w-0">
              <span className="font-medium text-ink-2">{humanize(m.check)}</span>
              {!m.passed && m.severity ? (
                <Badge tone={SEVERITY_TONES[m.severity]} className="mx-1.5">
                  {m.severity}
                </Badge>
              ) : null}
              <span className="text-ink-3"> — {m.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
