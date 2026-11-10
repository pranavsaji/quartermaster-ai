"use client";

import { PO_STATUSES, type DeliveryDto, type InvoiceDto, type PurchaseOrderDto } from "@qm/contracts";
import { useCallback, useMemo, useState } from "react";
import { DelayDialog, ReceiveDialog, type DeliveryTarget } from "@/components/orders/DeliveryDialogs";
import { InvoiceForm, type InvoicePrefill } from "@/components/orders/InvoiceForm";
import { InvoicesGrid } from "@/components/orders/InvoicesGrid";
import { OrdersGrid, type OrderRow } from "@/components/orders/OrdersGrid";
import { useSession } from "@/components/session/SessionProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { LoadMore } from "@/components/ui/LoadMore";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api } from "@/lib/api";
import { date, humanize } from "@/lib/format";
import { usePagedResource, useResource } from "@/lib/hooks";

/** Proposals that never became orders; they live on the procurement pages. */
const NOT_ORDERS = new Set<PurchaseOrderDto["status"]>(["PROPOSED", "BLOCKED", "SUPERSEDED"]);
/** Every other status, asked of the API so proposals never take up a page of orders. */
const ORDER_STATUSES = PO_STATUSES.filter((s) => !NOT_ORDERS.has(s));

export function OrdersPage() {
  const { user, can } = useSession();
  const orders = usePagedResource(
    (cursor, signal) => api.purchaseOrders.list({ limit: 100, cursor, statuses: ORDER_STATUSES }, { signal }),
    [],
  );
  const deliveries = useResource((signal) => api.deliveries.list({ signal }), []);
  const invoices = useResource((signal) => api.invoices.list({ signal }), []);
  const suppliers = useResource((signal) => api.suppliers.list({ signal }), []);
  const [receiving, setReceiving] = useState<DeliveryTarget | null>(null);
  const [delaying, setDelaying] = useState<DeliveryTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invoicePrefill, setInvoicePrefill] = useState<InvoicePrefill | null>(null);

  const placedOrders = useMemo(() => orders.items?.filter((po) => !NOT_ORDERS.has(po.status)), [orders.items]);
  const rows = useMemo<OrderRow[] | undefined>(() => {
    if (!placedOrders) return undefined;
    const byPo = new Map((deliveries.data?.items ?? []).map((d) => [d.purchase_order_id, d]));
    return placedOrders.map((po) => ({ ...po, delivery_view: byPo.get(po.id) ?? po.delivery }));
  }, [placedOrders, deliveries.data]);

  const targetOf = (row: OrderRow): DeliveryTarget | null => (row.delivery_view ? { po: row, delivery: row.delivery_view } : null);
  const onReceive = useCallback((row: OrderRow) => setReceiving(targetOf(row)), []);
  const onDelay = useCallback((row: OrderRow) => setDelaying(targetOf(row)), []);
  // InvoiceForm scrolls itself into view (respecting reduced motion) and takes focus.
  const onInvoice = useCallback((row: OrderRow) => setInvoicePrefill((prev) => ({ po: row, seq: (prev?.seq ?? 0) + 1 })), []);

  const setDeliveries = deliveries.setData;
  const reloadOrders = orders.reload;
  const onDeliveryUpdated = useCallback(
    (d: DeliveryDto) => {
      setDeliveries((prev) => {
        const items = prev?.items ?? [];
        return { items: items.some((x) => x.id === d.id) ? items.map((x) => (x.id === d.id ? d : x)) : [...items, d] };
      });
      setNotice(`Delivery ${humanize(d.status).toLowerCase()} — expected ${date(d.expected_date)}.`);
      reloadOrders(); // receiving can move the PO to FULFILLED
    },
    [setDeliveries, reloadOrders],
  );

  const setInvoices = invoices.setData;
  const onAnalyzed = useCallback(
    (inv: InvoiceDto) => setInvoices((prev) => ({ items: [inv, ...(prev?.items ?? []).filter((x) => x.id !== inv.id)] })),
    [setInvoices],
  );

  const supplierNames = useMemo(() => new Map((suppliers.data?.items ?? []).map((s) => [s.id, s.name])), [suppliers.data]);
  const poNumbers = useMemo(() => new Map((orders.items ?? []).map((o) => [o.id, o.number])), [orders.items]);

  return (
    <>
      <PageHeader
        title="Orders & invoices"
        description="Paid orders, their deliveries, and supplier invoices checked against each order before anything is settled."
        actions={
          <RefreshButton
            onClick={() => {
              orders.reload();
              deliveries.reload();
              invoices.reload();
            }}
            loading={orders.refreshing}
          />
        }
      />

      {notice ? (
        <Notice tone="allow" live className="mb-4">
          {notice}
        </Notice>
      ) : null}

      <div className="space-y-6">
        <Card aria-labelledby="orders-title">
          <CardHeader
            id="orders-title"
            title="Purchase orders"
            actions={<SourceLabel source="SANDBOX_SUPPLIER">Sandbox suppliers · simulated deliveries</SourceLabel>}
          />
          <div className="p-3">
            {/* Deliveries only decorate the orders: their failure is reported without hiding the grid. */}
            <ResourceView resource={deliveries} hasData={Boolean(deliveries.data)} errorTitle="Couldn't load deliveries" />
            <ResourceView resource={orders} hasData={Boolean(orders.items)}>
              <OrdersGrid
                rows={rows}
                canManage={can("manageDeliveries")}
                canInvoice={can("analyzeInvoices")}
                onReceive={onReceive}
                onDelay={onDelay}
                onInvoice={onInvoice}
              />
              <LoadMore state={orders} noun="orders" />
            </ResourceView>
          </div>
        </Card>

        <div>
          {can("analyzeInvoices") ? (
            suppliers.data && placedOrders ? (
              <InvoiceForm
                suppliers={suppliers.data.items}
                orders={placedOrders}
                currency={user.organization.currency}
                timeZone={user.organization.timezone}
                prefill={invoicePrefill}
                onAnalyzed={onAnalyzed}
              />
            ) : suppliers.error ? (
              <ErrorNotice error={suppliers.error} onRetry={suppliers.reload} title="Couldn't load suppliers" />
            ) : (
              <SkeletonCard lines={6} />
            )
          ) : (
            <Notice tone="info">Managers and owners can analyze supplier invoices.</Notice>
          )}
        </div>

        <Card aria-labelledby="invoices-title">
          <CardHeader id="invoices-title" title="Invoices" description="Every analyzed invoice, with its match result." />
          <div className="p-3">
            <ResourceView resource={invoices} hasData={Boolean(invoices.data)}>
              <InvoicesGrid invoices={invoices.data?.items} supplierNames={supplierNames} poNumbers={poNumbers} />
            </ResourceView>
          </div>
        </Card>
      </div>

      {receiving ? <ReceiveDialog target={receiving} onClose={() => setReceiving(null)} onDone={onDeliveryUpdated} /> : null}
      {delaying ? (
        <DelayDialog target={delaying} timeZone={user.organization.timezone} onClose={() => setDelaying(null)} onDone={onDeliveryUpdated} />
      ) : null}
    </>
  );
}
