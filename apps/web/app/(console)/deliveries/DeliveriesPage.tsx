"use client";

import { PO_STATUSES, type DeliveryDto, type PurchaseOrderDto } from "@qm/contracts";
import { useCallback, useMemo, useRef, useState } from "react";
import { DeliverySchedule, type DropRequest } from "@/components/deliveries/DeliverySchedule";
import { DelayDialog, type DeliveryTarget } from "@/components/orders/DeliveryDialogs";
import { useSession } from "@/components/session/SessionProvider";
import { StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ResourceView } from "@/components/ui/ResourceView";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api } from "@/lib/api";
import { buildSchedule, rescheduleError } from "@/lib/delivery-schedule";
import { date, todayIso } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { DELIVERY_STATUS_TONES } from "@/lib/labels";

/** Orders that can have a delivery (proposals never do). */
const ORDER_STATUSES = PO_STATUSES.filter((s) => !["PROPOSED", "BLOCKED", "SUPERSEDED"].includes(s));

interface PendingMove {
  target: DeliveryTarget;
  newExpected: string;
  finalize: (accept: boolean) => void;
}

/**
 * Delivery schedule (Bryntum Scheduler): one row per supplier, one bar per delivery from the day
 * the order was placed to the day it is expected. Managers drag a bar later to report a delay;
 * the drop only sticks once the delay (with its reason) is recorded by the API.
 */
export function DeliveriesPage() {
  const { user, can } = useSession();
  const timeZone = user.organization.timezone;
  const deliveries = useResource((signal) => api.deliveries.list({ signal }), []);
  const orders = useResource((signal) => api.purchaseOrders.list({ limit: 200, statuses: ORDER_STATUSES }, { signal }), []);
  const suppliers = useResource((signal) => api.suppliers.list({ signal }), []);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [notice, setNotice] = useState<{ tone: "allow" | "review"; text: string } | null>(null);
  const resolved = useRef(false);
  const canManage = can("manageDeliveries");
  const today = todayIso(timeZone);

  const orderById = useMemo(() => new Map((orders.data?.items ?? []).map((o) => [o.id, o])), [orders.data]);
  const supplierById = useMemo(() => new Map((suppliers.data?.items ?? []).map((s) => [s.id, s])), [suppliers.data]);
  const schedule = useMemo(
    () =>
      buildSchedule({
        deliveries: deliveries.data?.items ?? [],
        orders: orders.data?.items ?? [],
        suppliers: suppliers.data?.items ?? [],
        canManage,
        timeZone,
      }),
    [deliveries.data, orders.data, suppliers.data, canManage, timeZone],
  );

  const deliveryList = deliveries.data?.items;
  const onDropRequest = useCallback(
    (request: DropRequest) => {
      const delivery = deliveryList?.find((d) => d.id === request.eventId);
      const po: PurchaseOrderDto | undefined = delivery ? orderById.get(delivery.purchase_order_id) : undefined;
      const error = delivery ? rescheduleError(delivery, request.newExpected, today) : "That delivery is no longer listed.";
      if (error || !delivery || !po) {
        request.finalize(false);
        setNotice({ tone: "review", text: error ?? "Refresh the page and try again." });
        return;
      }
      resolved.current = false;
      setNotice(null);
      setPending({ target: { po, delivery }, newExpected: request.newExpected, finalize: request.finalize });
    },
    [deliveryList, orderById, today],
  );

  const setDeliveries = deliveries.setData;
  const onDelayed = useCallback(
    (d: DeliveryDto) => {
      resolved.current = true;
      pending?.finalize(true);
      setDeliveries((prev) => ({ items: (prev?.items ?? []).map((x) => (x.id === d.id ? d : x)) }));
      setNotice({ tone: "allow", text: `${pending?.target.po.number ?? "Delivery"} now expected ${date(d.expected_date)}.` });
    },
    [pending, setDeliveries],
  );
  const onDialogClose = useCallback(() => {
    // Cancelled, or the API refused: the bar goes back where it was.
    if (!resolved.current) pending?.finalize(false);
    setPending(null);
  }, [pending]);

  const loaded = Boolean(deliveries.data && orders.data && suppliers.data);
  const items = deliveries.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Delivery schedule"
        description={
          canManage
            ? "Every delivery on one timeline, by supplier. Drag a delivery later to report a delay."
            : "Every delivery on one timeline, by supplier."
        }
        actions={
          <RefreshButton
            onClick={() => {
              deliveries.reload();
              orders.reload();
              suppliers.reload();
            }}
            loading={deliveries.refreshing}
          />
        }
      />

      {notice ? (
        <Notice tone={notice.tone} live className="mb-4">
          {notice.text}
        </Notice>
      ) : null}

      <Card aria-labelledby="schedule-title">
        <CardHeader
          id="schedule-title"
          title="Deliveries by supplier"
          description="Bars run from the day the order was placed to the expected delivery day. Shaded days mark where a delayed delivery was originally due."
          actions={<SourceLabel source="SYNTHETIC">Synthetic fulfillment data</SourceLabel>}
        />
        <div className="p-3">
          <ResourceView resource={deliveries} hasData={Boolean(deliveries.data)} errorTitle="Couldn't load deliveries">
            {loaded && items.length === 0 ? (
              <EmptyState
                title="No deliveries yet"
                description="Approve and pay an order to see its delivery here."
                action={<ButtonLink href="/procurement">Go to procurement</ButtonLink>}
              />
            ) : loaded ? (
              <DeliverySchedule schedule={schedule} today={today} readOnly={!canManage} onDropRequest={onDropRequest} />
            ) : null}
          </ResourceView>

          {items.length > 0 ? (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-medium text-ink-2">Deliveries as a list</summary>
              <table className="mt-2 w-full text-left">
                <caption className="sr-only">Deliveries</caption>
                <thead className="text-ink-3">
                  <tr>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      Order
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      Supplier
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      Expected
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Delay
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id} className="border-t border-line">
                      <td className="py-1.5 pr-3 font-mono">{orderById.get(d.purchase_order_id)?.number ?? "—"}</td>
                      <td className="py-1.5 pr-3">{supplierById.get(d.supplier_id)?.name ?? "—"}</td>
                      <td className="py-1.5 pr-3">
                        <StatusBadge status={d.status} tones={DELIVERY_STATUS_TONES} kind="Delivery" />
                      </td>
                      <td className="py-1.5 pr-3 tnum">
                        {date(d.expected_date)}
                        {d.original_expected_date !== d.expected_date ? (
                          <span className="text-ink-3"> (was {date(d.original_expected_date)})</span>
                        ) : null}
                      </td>
                      <td className="py-1.5">{d.delay_reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ) : null}
        </div>
      </Card>

      {pending ? (
        <DelayDialog
          target={pending.target}
          timeZone={timeZone}
          initialDate={pending.newExpected}
          onClose={onDialogClose}
          onDone={onDelayed}
        />
      ) : null}
    </>
  );
}
