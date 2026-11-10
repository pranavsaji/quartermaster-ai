"use client";

import type { CatalogItemDto, SupplierDetailDto } from "@qm/contracts";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { CatalogItemDialog } from "@/components/suppliers/CatalogItemDialog";
import { SupplierBadges } from "@/components/suppliers/SupplierBadges";
import { SupplierDialog } from "@/components/suppliers/SupplierDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api } from "@/lib/api";
import { money, num, plural } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { categoryLabel } from "@/lib/labels";

type Editing = { kind: "supplier" } | { kind: "item"; item?: CatalogItemDto } | null;

export function SupplierDetail({ id }: { id: string }) {
  const { can, user } = useSession();
  const manage = can("manageSuppliers");
  const currency = user.organization.currency;
  const resource = useResource((signal) => api.suppliers.get(id, { signal }), [id]);
  const inventory = useResource((signal) => api.inventory.list({ signal }), [], { enabled: manage });
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supplier = resource.data?.supplier;
  const stockNames = useMemo(() => new Map((inventory.data?.items ?? []).map((i) => [i.id, i.name])), [inventory.data]);

  function onSupplierSaved(next: SupplierDetailDto) {
    resource.setData({ supplier: next });
    setMessage(`${next.name} saved.`);
  }

  function onItemSaved(shown: SupplierDetailDto, item: CatalogItemDto) {
    resource.setData((prev) => {
      const base = prev?.supplier ?? shown;
      const exists = base.catalog.some((c) => c.id === item.id);
      const catalog = exists ? base.catalog.map((c) => (c.id === item.id ? item : c)) : [...base.catalog, item];
      return { supplier: { ...base, catalog, catalog_items: catalog.length } };
    });
    setMessage(item.quarantined ? `${item.sku} saved, but it is quarantined.` : `${item.sku} saved.`);
  }

  return (
    <>
      <PageHeader
        title={supplier?.name ?? "Supplier"}
        meta={
          <>
            <Link href="/suppliers" className="text-[13px] font-medium text-accent hover:underline">
              ← Suppliers
            </Link>
            {supplier ? <SourceLabel source={supplier.data_source} /> : null}
          </>
        }
        description={supplier?.description ?? undefined}
        actions={
          <>
            <Button variant="secondary" onClick={resource.reload} loading={resource.refreshing}>
              Refresh
            </Button>
            {manage && supplier ? (
              <Button variant="primary" onClick={() => setEditing({ kind: "supplier" })}>
                Edit supplier
              </Button>
            ) : null}
          </>
        }
      />

      {message ? (
        <Notice tone="allow" live className="mb-4">
          {message}
        </Notice>
      ) : null}

      <ResourceView
        resource={resource}
        hasData={Boolean(supplier)}
        loading={<SkeletonCard lines={6} />}
        errorTitle="Couldn't load the supplier"
      >
        {supplier ? (
          <div className="space-y-6">
            <Card aria-labelledby="terms-title">
              <CardHeader id="terms-title" title="Terms" actions={<SupplierBadges supplier={supplier} />} />
              <CardBody>
                <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
                  <Term label="Lead time">{plural(supplier.lead_time_days, "day")}</Term>
                  <Term label="Sales tax">{`${supplier.tax_rate_bps / 100}%`}</Term>
                  <Term label="Website">
                    {supplier.website ? (
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        {supplier.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Term>
                </dl>
                <h3 className="mt-5 text-[12.5px] font-medium text-ink-3">Delivery and fees</h3>
                {supplier.fee_terms.length === 0 ? (
                  <p className="mt-1 text-[13px] text-ink-2">No fees.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-[13px]">
                    {supplier.fee_terms.map((f) => (
                      <li key={f.code} className="flex flex-wrap gap-x-2">
                        <span className="font-medium text-ink">{f.label}</span>
                        <span className="tnum text-ink-2">{money(f.amount_minor, currency)}</span>
                        {f.waived_over_minor !== null ? (
                          <span className="text-ink-3">free over {money(f.waived_over_minor, currency)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {!supplier.approved ? (
                  <Notice tone="info" className="mt-4">
                    Not approved yet: TrustRail blocks carts from this supplier until an owner adds it on the{" "}
                    <Link href="/mandate" className="font-medium text-accent hover:underline">
                      Spend mandate
                    </Link>
                    .
                  </Notice>
                ) : null}
              </CardBody>
            </Card>

            <Card aria-labelledby="catalog-title">
              <CardHeader
                id="catalog-title"
                title="Catalog"
                description="Products and pack prices the agent can choose from."
                actions={
                  manage ? (
                    <Button variant="primary" size="sm" onClick={() => setEditing({ kind: "item" })}>
                      Add product
                    </Button>
                  ) : null
                }
              />
              <CardBody>
                {supplier.catalog.length === 0 ? (
                  <EmptyState compact title="No products yet" description="Add what this supplier sells, with the price per pack." />
                ) : (
                  <CatalogTable
                    items={supplier.catalog}
                    stockNames={stockNames}
                    onEdit={manage ? (item) => setEditing({ kind: "item", item }) : undefined}
                  />
                )}
              </CardBody>
            </Card>
          </div>
        ) : null}
      </ResourceView>

      {editing?.kind === "supplier" && supplier ? (
        <SupplierDialog supplier={supplier} currency={currency} onClose={() => setEditing(null)} onSaved={onSupplierSaved} />
      ) : null}
      {editing?.kind === "item" && supplier ? (
        <CatalogItemDialog
          supplierId={supplier.id}
          supplierName={supplier.name}
          item={editing.item}
          currency={currency}
          inventory={inventory.data?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={(item) => onItemSaved(supplier, item)}
        />
      ) : null}
    </>
  );
}

function Term({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

function CatalogTable({
  items,
  stockNames,
  onEdit,
}: {
  items: CatalogItemDto[];
  stockNames: Map<string, string>;
  onEdit?: (item: CatalogItemDto) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <caption className="sr-only">Catalog</caption>
        <thead className="border-b border-line text-[11.5px] text-ink-3">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">
              Product
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Category
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Restocks
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Pack
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Price / pack
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Flags
            </th>
            {onEdit ? (
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2.5 pr-3 align-top">
                <p className="font-medium text-ink">{item.title}</p>
                <p className="font-mono text-[11px] text-ink-4">{item.sku}</p>
              </td>
              <td className="py-2.5 pr-3 align-top text-ink-2">{categoryLabel(item.category)}</td>
              <td className="py-2.5 pr-3 align-top text-ink-2">
                {item.inventory_item_id ? (stockNames.get(item.inventory_item_id) ?? "Linked item") : "—"}
              </td>
              <td className="tnum py-2.5 pr-3 text-right align-top">{num(item.pack_quantity)}</td>
              <td className="tnum py-2.5 pr-3 text-right align-top font-medium">{money(item.unit_price_minor, item.currency)}</td>
              <td className="py-2.5 pr-3 align-top">
                <span className="inline-flex flex-wrap gap-1.5">
                  {item.quarantined ? (
                    <Badge tone="block" title={item.quarantine_reason ?? undefined}>
                      Quarantined{item.quarantine_reason ? `: ${item.quarantine_reason}` : ""}
                    </Badge>
                  ) : null}
                  {!item.in_stock ? <Badge tone="review">Out of stock</Badge> : null}
                  {item.recurring ? <Badge tone="info">Recurring</Badge> : null}
                </span>
              </td>
              {onEdit ? (
                <td className="py-2.5 text-right align-top">
                  <Button size="sm" variant="secondary" onClick={() => onEdit(item)} aria-label={`Edit ${item.sku}`}>
                    Edit
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
