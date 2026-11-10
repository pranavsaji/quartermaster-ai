import type { PayPalNotificationStatusDto } from "@qm/contracts";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { dateTime, num, relativeTime } from "@/lib/format";

type Health = { tone: "allow" | "review" | "block" | "neutral"; label: string };

/** Overall state of PayPal's signed notifications (webhooks) for this workspace. */
export function notificationHealth(s: PayPalNotificationStatusDto): Health {
  if (!s.configured) return { tone: "neutral", label: "Not configured" };
  if (s.unconfirmed_captures_7d > 0) return { tone: "review", label: "Missing confirmations" };
  if (s.rejected_signatures_24h > 0) return { tone: "review", label: "Rejected deliveries" };
  if (!s.last_received_at) return { tone: "neutral", label: "None received yet" };
  return { tone: "allow", label: "Receiving" };
}

/**
 * Whether PayPal's webhooks reach this deployment: payments are confirmed by the capture response
 * and again by PayPal's signed notification, so captures without one point at a webhook problem.
 */
export function PayPalNotificationsCard({ status }: { status: PayPalNotificationStatusDto | undefined }) {
  const health = status ? notificationHealth(status) : null;
  return (
    <Card aria-labelledby="paypal-notifications-title">
      <CardHeader
        id="paypal-notifications-title"
        title="PayPal notifications"
        description="PayPal confirms every capture with a signed webhook. Each one is verified with PayPal before it changes anything."
        actions={
          health ? (
            <Badge tone={health.tone} dot>
              {health.label}
            </Badge>
          ) : null
        }
      />
      <CardBody>
        {!status ? (
          <Skeleton className="h-12" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] lg:grid-cols-4">
            <Item label="Last received">
              {status.last_received_at ? (
                <span title={dateTime(status.last_received_at)}>
                  {relativeTime(status.last_received_at)}
                  {status.last_event_type ? (
                    <span className="block font-mono text-[11.5px] text-ink-3">{status.last_event_type}</span>
                  ) : null}
                </span>
              ) : (
                "Never"
              )}
            </Item>
            <Item label="Received (24 h)">{num(status.received_24h)}</Item>
            <Item label="Captures without a notification (7 d)" warn={status.unconfirmed_captures_7d > 0}>
              {num(status.unconfirmed_captures_7d)}
            </Item>
            <Item label="Rejected signatures (24 h)" warn={status.rejected_signatures_24h > 0}>
              {num(status.rejected_signatures_24h)}
            </Item>
          </dl>
        )}
      </CardBody>
    </Card>
  );
}

function Item({ label, warn = false, children }: { label: string; warn?: boolean; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className={warn ? "tnum mt-0.5 font-medium text-review" : "tnum mt-0.5 text-ink"}>{children}</dd>
    </div>
  );
}
