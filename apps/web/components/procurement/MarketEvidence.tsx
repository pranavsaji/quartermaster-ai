import type { MarketReferenceDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { SourceLabel } from "@/components/ui/SourceLabel";
import type { Tone } from "@/lib/labels";
import { money, num, relativeTime } from "@/lib/format";

const STATUS: Record<MarketReferenceDto["status"], { tone: Tone; label: string; explain: string }> = {
  AVAILABLE: { tone: "allow", label: "Available", explain: "Reference price computed from comparable listings." },
  UNAVAILABLE: { tone: "review", label: "Unavailable", explain: "No comparable listings were found for this item." },
  STALE: { tone: "review", label: "Stale", explain: "Listings are older than the freshness window." },
  DISABLED: { tone: "neutral", label: "Disabled", explain: "Channel3 market data is not configured." },
  ERROR: { tone: "block", label: "Error", explain: "The market data provider returned an error." },
};

function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Channel3 market evidence: reference prices TrustRail uses for the price-premium check. */
export function MarketEvidence({
  market,
  itemNames,
  currency,
}: {
  market: MarketReferenceDto[];
  itemNames: Map<string, string>;
  currency: string;
}) {
  return (
    <Card aria-labelledby="market-title">
      <CardHeader
        id="market-title"
        title="Market evidence"
        eyebrow={<SourceLabel source="CHANNEL3_MARKET">Channel3 market data (reference only — not purchasable here)</SourceLabel>}
        description="Public listings used only to sanity-check supplier prices. Nothing here can be bought through Quartermaster."
      />
      <CardBody className="space-y-5">
        {market.length === 0 ? (
          <EmptyState compact title="No market references" description="Market research hasn't run for this request." />
        ) : null}
        {market.map((ref) => {
          const s = STATUS[ref.status];
          const name = itemNames.get(ref.inventory_item_id) ?? "Item";
          return (
            <section key={ref.inventory_item_id} aria-label={`Market evidence for ${name}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[14px] font-semibold text-ink">{name}</h3>
                <Badge tone={s.tone} dot label={`Market data: ${s.label}`}>
                  {s.label}
                </Badge>
                <span className="ml-auto text-[12.5px] text-ink-3">
                  {ref.reference_unit_price_minor !== null ? (
                    <>
                      Reference unit price{" "}
                      <span className="tnum font-semibold text-ink">{money(ref.reference_unit_price_minor, currency)}</span>{" "}
                      · n={ref.sample_size}
                    </>
                  ) : (
                    "No reference price"
                  )}
                  {ref.observed_at ? <> · observed {relativeTime(ref.observed_at)}</> : null}
                </span>
              </div>
              {ref.status !== "AVAILABLE" ? (
                <Notice tone={s.tone === "block" ? "block" : "neutral"} className="mt-2">
                  {s.explain} TrustRail treats a missing reference as a reason for human review, never as approval.
                </Notice>
              ) : null}
              {ref.quotes.length > 0 ? (
                <div className="mt-2 overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[640px] text-left text-[12.5px]">
                    <thead className="bg-canvas text-[11.5px] text-ink-3">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Listing
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Merchant
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Price
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Pack
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Unit price
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Used
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {ref.quotes.map((q) => {
                        const href = safeHref(q.url);
                        return (
                          <tr key={q.id} className={q.comparable ? undefined : "text-ink-4"}>
                            <td className="max-w-[280px] px-3 py-2">
                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="line-clamp-2 text-ink-2 hover:text-accent hover:underline"
                                >
                                  {q.title}
                                  <span className="sr-only"> (opens external site)</span>
                                </a>
                              ) : (
                                <span className="line-clamp-2">{q.title}</span>
                              )}
                              <span className="text-[11px] text-ink-4">{q.availability}</span>
                            </td>
                            <td className="px-3 py-2 font-mono text-[11.5px]">{q.merchant_domain}</td>
                            <td className="tnum px-3 py-2 text-right">{money(q.price_minor, q.currency)}</td>
                            <td className="tnum px-3 py-2 text-right">{q.pack_quantity !== null ? num(q.pack_quantity) : "—"}</td>
                            <td className="tnum px-3 py-2 text-right font-medium">
                              {q.normalized_unit_price_minor !== null ? money(q.normalized_unit_price_minor, q.currency) : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {q.comparable ? <Badge tone="info">Comparable</Badge> : <Badge tone="neutral">Excluded</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          );
        })}
      </CardBody>
    </Card>
  );
}
