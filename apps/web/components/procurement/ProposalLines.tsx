import type { LineKind, PurchaseOrderDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/lib/labels";
import { categoryLabel, lookup } from "@/lib/labels";
import { money, num } from "@/lib/format";

const KIND_TONES: Record<LineKind, Tone> = { PRODUCT: "neutral", SHIPPING: "info", TAX: "neutral", FEE: "review" };
const KIND_ORDER: Record<LineKind, number> = { PRODUCT: 0, SHIPPING: 1, FEE: 2, TAX: 3 };

/** Itemised cart: every product, shipping, fee and tax line, plus totals. */
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-[13px]">
        <caption className="sr-only">Line items for {po.number}</caption>
        <thead className="border-b border-line text-[11.5px] text-ink-3">
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
                <Badge tone={lookup<LineKind, Tone>(KIND_TONES, line.kind, "neutral")}>{line.kind}</Badge>
              </td>
              <td className="py-2 pr-2 align-top">
                <p className="text-ink">{line.description}</p>
                <p className="text-[11.5px] text-ink-4">
                  {line.sku ? <span className="font-mono">{line.sku}</span> : null}
                  {line.sku && line.category ? " · " : null}
                  {line.category ? categoryLabel(line.category) : null}
                  {line.pack_quantity ? ` · pack of ${num(line.pack_quantity)}` : null}
                </p>
              </td>
              <td className="tnum py-2 pr-2 text-right align-top">{num(line.quantity)}</td>
              <td className="tnum py-2 pr-2 text-right align-top text-ink-2">{money(line.unit_price_minor, po.currency)}</td>
              <td className="tnum py-2 text-right align-top font-medium">{money(line.line_total_minor, po.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="tnum border-t border-line-strong">
          {totals.map((t) => (
            <tr key={t.label}>
              <th
                scope="row"
                colSpan={4}
                className={t.strong ? "pt-2 text-right text-[13.5px] font-semibold text-ink" : "pt-1.5 text-right font-normal text-ink-3"}
              >
                {t.label}
              </th>
              <td className={t.strong ? "pt-2 text-right text-[15px] font-semibold text-ink" : "pt-1.5 text-right text-ink-2"}>
                {money(t.value, po.currency)}
              </td>
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );
}
