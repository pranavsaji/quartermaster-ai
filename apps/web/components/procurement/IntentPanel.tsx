import type { ProcurementRequestDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { date, describeDemandMultiplier, money, num } from "@/lib/format";
import { AiModeBadge } from "./AiModeBadge";

/** "What the agent understood": the structured intent extracted from the instruction. */
export function IntentPanel({ request, itemNames }: { request: ProcurementRequestDto; itemNames: Map<string, string> }) {
  const intent = request.intent;
  return (
    <Card aria-labelledby="intent-title">
      <CardHeader
        id="intent-title"
        title="Interpreted intent"
        description="What Quartermaster understood. Untrusted text never reaches the payment path; only these structured fields do."
        actions={intent ? <AiModeBadge mode={intent.ai_mode} /> : null}
      />
      <CardBody className="space-y-4">
        <blockquote className="rounded-lg border-l-[3px] border-accent bg-accent-soft/50 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
          “{request.instruction}”
        </blockquote>

        {!intent ? (
          <p className="text-[13px] text-ink-3">The instruction hasn&apos;t been interpreted yet — run research to start.</p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="text-ink-3">Demand</dt>
                <dd className="tnum font-medium text-ink">{num(intent.demand_multiplier, 2)}× normal</dd>
                <dd className="text-[12px] text-ink-3">{describeDemandMultiplier(intent.demand_multiplier)}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Budget cap</dt>
                <dd className="tnum font-medium text-ink">
                  {intent.budget_limit_minor !== null ? money(intent.budget_limit_minor, request.currency) : "None stated"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">Required by</dt>
                <dd className="tnum font-medium text-ink">{intent.required_by ? date(intent.required_by) : "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Alternatives</dt>
                <dd className="font-medium text-ink">{request.allow_alternatives ? "Allowed" : "Exact items only"}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-1.5 text-[13px] text-ink-3">Items in scope</p>
              {intent.inventory_item_ids.length === 0 ? (
                <p className="text-[13px] text-ink-3">No inventory items matched.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {intent.inventory_item_ids.map((itemId) => (
                    <li key={itemId}>
                      <Badge tone="neutral" size="md">
                        {itemNames.get(itemId) ?? itemId.slice(0, 8)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {intent.notes ? <p className="text-[13px] leading-relaxed text-ink-2">{intent.notes}</p> : null}

            {intent.unsupported_requests.length > 0 ? (
              <Notice tone="review" title="Parts of the instruction were not actioned">
                <ul className="list-disc space-y-0.5 pl-4">
                  {intent.unsupported_requests.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </Notice>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
