"use client";

import type { MarketReferenceDto } from "@qm/contracts";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { lookup, type Tone } from "@/lib/labels";
import { humanize, money, num, plural, relativeTime } from "@/lib/format";
import { availabilityLabel } from "@/lib/plain-language";

type StatusInfo = { tone: Tone; label: string; explain: string };
type Quote = MarketReferenceDto["quotes"][number];

const STATUS: Record<MarketReferenceDto["status"], StatusInfo> = {
  AVAILABLE: { tone: "allow", label: "Reference found", explain: "Reference price worked out from comparable listings." },
  UNAVAILABLE: { tone: "review", label: "No comparable listing", explain: "No comparable listings were found for this item." },
  STALE: { tone: "review", label: "Out of date", explain: "The listings found are older than the freshness window." },
  DISABLED: { tone: "neutral", label: "Market data off", explain: "Market data isn't set up on this server." },
  ERROR: { tone: "block", label: "Couldn't check", explain: "The market data provider returned an error." },
};

function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function ListingTitle({ quote }: { quote: Quote }) {
  const href = safeHref(quote.url);
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="line-clamp-2 text-ink-2 hover:text-accent hover:underline">
      {quote.title}
      <span className="sr-only"> (opens external site)</span>
    </a>
  ) : (
    <span className="line-clamp-2 text-ink-2">{quote.title}</span>
  );
}

function UsedBadge({ comparable }: { comparable: boolean }) {
  return comparable ? <Badge tone="info">Comparable</Badge> : <Badge tone="neutral">Not comparable</Badge>;
}

/** Listings as a table from `md` up; on a phone each listing is a stacked row. */
function QuoteRows({ quotes }: { quotes: Quote[] }) {
  return (
    <>
      <ul className="divide-y divide-line rounded-lg border border-line md:hidden">
        {quotes.map((q) => (
          <li key={q.id} className="px-3 py-2.5 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm">
                <ListingTitle quote={q} />
              </div>
              <UsedBadge comparable={q.comparable} />
            </div>
            <p className="tnum mt-1 flex flex-wrap gap-x-3 text-ink-3">
              <span>{q.merchant_domain}</span>
              <span>{money(q.price_minor, q.currency)}</span>
              {q.pack_quantity !== null ? <span>pack of {num(q.pack_quantity)}</span> : null}
              {q.normalized_unit_price_minor !== null ? (
                <span className="font-medium text-ink">{money(q.normalized_unit_price_minor, q.currency)} each</span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-lg border border-line md:block">
        <table className="w-full text-left text-xs">
          <thead className="bg-canvas text-2xs text-ink-3">
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
            {quotes.map((q) => (
              <tr key={q.id} className={q.comparable ? undefined : "text-ink-3"}>
                <td className="max-w-[320px] px-3 py-2">
                  <ListingTitle quote={q} />
                  {q.availability ? <span className="text-2xs text-ink-4">{availabilityLabel(q.availability)}</span> : null}
                </td>
                <td className="px-3 py-2">{q.merchant_domain}</td>
                <td className="tnum px-3 py-2 text-right">{money(q.price_minor, q.currency)}</td>
                <td className="tnum px-3 py-2 text-right">{q.pack_quantity !== null ? num(q.pack_quantity) : "—"}</td>
                <td className="tnum px-3 py-2 text-right font-medium">
                  {q.normalized_unit_price_minor !== null ? money(q.normalized_unit_price_minor, q.currency) : "—"}
                </td>
                <td className="px-3 py-2">
                  <UsedBadge comparable={q.comparable} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ItemEvidence({ reference, name, currency }: { reference: MarketReferenceDto; name: string; currency: string }) {
  const [showAll, setShowAll] = useState(false);
  const s = lookup<MarketReferenceDto["status"], StatusInfo>(STATUS, reference.status, {
    tone: "neutral",
    label: humanize(reference.status),
    explain: "The market data provider reported a status this console doesn't recognise.",
  });
  const comparable = reference.quotes.filter((q) => q.comparable);
  const excluded = reference.quotes.length - comparable.length;
  const shown = showAll ? reference.quotes : comparable;
  return (
    <section aria-label={`Market evidence for ${name}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-ink">{name}</h3>
        <Badge tone={s.tone} dot label={`Market data: ${s.label}`}>
          {s.label}
        </Badge>
        <span className="text-xs text-ink-3 sm:ml-auto">
          {reference.reference_unit_price_minor !== null ? (
            <>
              Reference <span className="tnum font-semibold text-ink">{money(reference.reference_unit_price_minor, currency)}</span> per
              unit, from {plural(reference.sample_size, "listing")}
            </>
          ) : (
            "No reference price"
          )}
          {reference.observed_at ? <> · checked {relativeTime(reference.observed_at)}</> : null}
        </span>
      </div>
      {reference.status !== "AVAILABLE" ? (
        <Notice tone={s.tone === "block" ? "block" : "neutral"} className="mt-2">
          {s.explain} Without a reference, TrustRail asks you to judge the price; it never treats a missing reference as approval.
        </Notice>
      ) : null}
      {shown.length > 0 ? (
        <div className="mt-2">
          <QuoteRows quotes={shown} />
        </div>
      ) : null}
      {excluded > 0 ? (
        <Button variant="ghost" size="sm" className="mt-1.5 -ml-2" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
          {showAll ? `Hide ${plural(excluded, "listing")} not comparable` : `Show ${plural(excluded, "listing")} not comparable`}
        </Button>
      ) : null}
    </section>
  );
}

/** Market evidence: public reference prices TrustRail uses for the price check. */
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
        description="Public listings used only to sanity-check supplier prices. Nothing here can be bought through Quartermaster."
        actions={<SourceLabel source="CHANNEL3_MARKET">Channel3 market data · reference only</SourceLabel>}
      />
      <CardBody className="space-y-6">
        {market.length === 0 ? (
          <EmptyState compact icon="search" title="No market references" description="Market research hasn't run for this request." />
        ) : null}
        {market.map((ref) => (
          <ItemEvidence
            key={ref.inventory_item_id}
            reference={ref}
            name={itemNames.get(ref.inventory_item_id) ?? "Item"}
            currency={currency}
          />
        ))}
      </CardBody>
    </Card>
  );
}
