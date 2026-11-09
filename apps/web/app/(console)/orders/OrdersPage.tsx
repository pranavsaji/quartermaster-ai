"use client";

import type { DeliveryDto, InvoiceDto, PurchaseOrderDto } from "@qm/contracts";
import { useCallback, useMemo, useRef, useState } from "react";
import { DelayDialog, ReceiveDialog, type DeliveryTarget } from "@/components/orders/DeliveryDialogs";
import { InvoiceForm, type InvoicePrefill } from "@/components/orders/InvoiceForm";
import { InvoicesGrid } from "@/components/orders/InvoicesGrid";
import { OrdersGrid, type OrderRow } from "@/components/orders/OrdersGrid";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshErrorNotice } from "@/components/ui/RefreshErrorNotice";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api, fetchAllPages } from "@/lib/api";
import { date, humanize } from "@/lib/format";
import { useResource } from "@/lib/hooks";

/** Proposals that never became orders; they live on the procurement pages. */
const NOT_ORDERS = new Set<PurchaseOrderDto["status"]>(["PROPOSED", "BLOCKED", "SUPERSEDED"]);

export function OrdersPage() {
  const { user, can } = useSession();
  const orders = useResource((signal) => fetchAllPages((cursor) => api.purchaseOrders.list({ limit: 100, cursor }, { signal })), []);
  const deliveries = useResource((signal) => api.deliveries.list({ signal }), []);
  const invoices = useResource((signal) => api.invoices.list({ signal }), []);
  const suppliers = useResource((signal) => api.suppliers.list({ signal }), []);
  const [receiving, setReceiving] = useState<DeliveryTarget | null>(null);
  const [delaying, setDelaying] = useState<DeliveryTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invoicePrefill, setInvoicePrefill] = useState<InvoicePrefill | null>(null);
  const invoiceSection = useRef<HTMLDivElement>(null);

  const placedOrders = useMemo(() => orders.data?.filter((po) => !NOT_ORDERS.has(po.status)), [orders.data]);
  const rows = useMemo<OrderRow[] | undefined>(() => {
    if (!placedOrders) return undefined;
    const byPo = new Map((deliveries.data?.items ?? []).map((d) => [d.purchase_order_id, d]));
    return placedOrders.map((po) => ({ ...po, delivery_view: byPo.get(po.id) ?? po.delivery }));
  }, [placedOrders, deliveries.data]);

  const targetOf = (row: OrderRow): DeliveryTarget | null => (row.delivery_view ? { po: row, delivery: row.delivery_view } : null);
  const onReceive = useCallback((row: OrderRow) => setReceiving(targetOf(row)), []);
  const onDelay = useCallback((row: OrderRow) => setDelaying(targetOf(row)), []);
  const onInvoice = useCallback((row: OrderRow) => {
    setInvoicePrefill((prev) => ({ po: row, seq: (prev?.seq ?? 0) + 1 }));
    invoiceSection.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
  const poNumbers = useMemo(() => new Map((orders.data ?? []).map((o) => [o.id, o.number])), [orders.data]);

  return (
    <>
      <PageHeader
        title="Orders & invoices"
        description="Paid purchase orders, their (synthetic) deliveries, and supplier invoices matched before settlement."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              orders.reload();
              deliveries.reload();
              invoices.reload();
            }}
            loading={orders.refreshing}
          >
            Refresh
          </Button>
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
            actions={
              <>
                <SourceLabel source="SANDBOX_SUPPLIER">Sandbox suppliers</SourceLabel>
                <SourceLabel source="SYNTHETIC">Synthetic fulfillment data</SourceLabel>
              </>
            }
          />
          <div className="p-3">
            <RefreshErrorNotice
              error={orders.error}
              hasData={Boolean(orders.data)}
              updatedAt={orders.updatedAt}
              onRetry={orders.reload}
              className="mb-3"
            />
            <RefreshErrorNotice
              error={deliveries.error}
              hasData={Boolean(deliveries.data)}
              updatedAt={deliveries.updatedAt}
              onRetry={deliveries.reload}
              className="mb-3"
            />
            {orders.error && !orders.data ? (
              <ErrorNotice error={orders.error} onRetry={orders.reload} />
            ) : (
              <OrdersGrid
                rows={rows}
                canManage={can("manageDeliveries")}
                canInvoice={can("analyzeInvoices")}
                onReceive={onReceive}
                onDelay={onDelay}
                onInvoice={onInvoice}
              />
            )}
            {deliveries.error && !deliveries.data ? (
              <ErrorNotice error={deliveries.error} onRetry={deliveries.reload} title="Couldn't load deliveries" className="mt-3" />
            ) : null}
          </div>
        </Card>

        <div ref={invoiceSection} className="scroll-mt-20">
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
            <RefreshErrorNotice
              error={invoices.error}
              hasData={Boolean(invoices.data)}
              updatedAt={invoices.updatedAt}
              onRetry={invoices.reload}
              className="mb-3"
            />
            {invoices.error && !invoices.data ? (
              <ErrorNotice error={invoices.error} onRetry={invoices.reload} />
            ) : (
              <InvoicesGrid invoices={invoices.data?.items} supplierNames={supplierNames} poNumbers={poNumbers} />
            )}
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
