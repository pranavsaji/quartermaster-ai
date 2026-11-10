import type { LineKind, PurchaseOrderDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/lib/labels";
import { categoryLabel, lookup } from "@/lib/labels";
import { humanize, money, num } from "@/lib/format";

const KIND_TONES: Record<LineKind, Tone> = { PRODUCT: "neutral", SHIPPING: "info", TAX: "neutral", FEE: "review" };
const KIND_ORDER: Record<LineKind, number> = { PRODUCT: 0, SHIPPING: 1, FEE: 2, TAX: 3 };
const KIND_LABELS: Record<LineKind, string> = { PRODUCT: "Product", SHIPPING: "Shipping", TAX: "Tax", FEE: "Fee" };

type Line = PurchaseOrderDto["items"][number];

function LineMeta({ line }: { line: Line }) {
  return (
    <p className="text-2xs text-ink-4">
      {line.sku ? <span className="font-mono">{line.sku}</span> : null}
      {line.sku && line.category ? " · " : null}
      {line.category ? categoryLabel(line.category) : null}
      {line.pack_quantity ? ` · pack of ${num(line.pack_quantity)}` : null}
    </p>
  );
}

function KindBadge({ kind }: { kind: LineKind }) {
  return <Badge tone={lookup<LineKind, Tone>(KIND_TONES, kind, "neutral")}>{lookup(KIND_LABELS, kind, humanize(kind))}</Badge>;
}

/**
 * Itemised cart: every product, shipping, fee and tax line, plus totals. A table from `sm` up;
 * on a phone each line is a stacked row (description, then quantity × unit = total), so nothing
 * scrolls sideways.
 */
export function ProposalLines({ po }: { po: PurchaseOrderDto }) {
  const items = [...po.items].sort((a, b) => lookup(KIND_ORDER, a.kind, 9) - lookup(KIND_ORDER, b.kind, 9));
  const totals: { label: string; value: number; strong?: boolean }[] = [
    { label: "Subtotal", value: po.subtotal_minor },
    { label: "Shipping", value: po.shipping_minor },
    { label: "Fees", value: po.fees_minor },
    { label: "Tax", value: po.tax_minor },
    { label: "Total", value: po.total_minor, strong: true },
  ];
  return (
    <div>
      <ul className="divide-y divide-line sm:hidden" aria-label={`Line items for ${po.number}`}>
        {items.map((line) => (
          <li key={line.id} className="py-2.5 first:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-ink">{line.description}</p>
                <LineMeta line={line} />
              </div>
              <KindBadge kind={line.kind} />
            </div>
            <p className="tnum mt-1 flex justify-between text-xs text-ink-3">
              <span>
                {num(line.quantity)} × {money(line.unit_price_minor, po.currency)}
              </span>
              <span className="font-medium text-ink">{money(line.line_total_minor, po.currency)}</span>
            </p>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-left text-sm sm:table">
        <caption className="sr-only">Line items for {po.number}</caption>
        <thead className="border-b border-line text-2xs text-ink-3">
          <tr>
            <th scope="col" className="py-2 pr-2 font-medium">
              Type
            </th>
            <th scope="col" className="py-2 pr-2 font-medium">
              Description
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Qty
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Unit
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Line total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((line) => (
            <tr key={line.id}>
              <td className="py-2 pr-2 align-top">
                <KindBadge kind={line.kind} />
              </td>
              <td className="py-2 pr-2 align-top">
                <p className="text-ink">{line.description}</p>
                <LineMeta line={line} />
              </td>
              <td className="tnum py-2 pr-2 text-right align-top">{num(line.quantity)}</td>
              <td className="tnum py-2 pr-2 text-right align-top text-ink-2">{money(line.unit_price_minor, po.currency)}</td>
              <td className="tnum py-2 text-right align-top font-medium">{money(line.line_total_minor, po.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totals: full width on every screen, right-aligned figures. */}
      <dl className="tnum mt-1 border-t border-line-strong pt-1.5 text-sm">
        {totals.map((t) => (
          <div
            key={t.label}
            className={
              t.strong ? "flex justify-between pt-2 sm:justify-end sm:gap-10" : "flex justify-between pt-1 sm:justify-end sm:gap-10"
            }
          >
            <dt className={t.strong ? "font-semibold text-ink" : "text-ink-3"}>{t.label}</dt>
            <dd className={t.strong ? "min-w-24 text-right text-base font-semibold text-ink" : "min-w-24 text-right text-ink-2"}>
              {money(t.value, po.currency)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
