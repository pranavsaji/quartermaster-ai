"use client";

import type { SupplierDetailDto } from "@qm/contracts";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { SupplierBadges } from "@/components/suppliers/SupplierBadges";
import { SupplierDialog } from "@/components/suppliers/SupplierDialog";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api } from "@/lib/api";
import { money, num, plural } from "@/lib/format";
import { useResource } from "@/lib/hooks";

export function SuppliersPage() {
  const { can, user } = useSession();
  const suppliers = useResource((signal) => api.suppliers.list({ signal }), []);
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState<SupplierDetailDto | null>(null);
  const currency = user.organization.currency;
  const items = suppliers.data?.items;

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who you buy from, on what terms, and what they sell. The agent only compares offers from these catalogs."
        actions={
          <>
            <Button variant="secondary" onClick={suppliers.reload} loading={suppliers.refreshing}>
              Refresh
            </Button>
            {can("manageSuppliers") ? (
              <Button variant="primary" onClick={() => setAdding(true)}>
                Add supplier
              </Button>
            ) : null}
          </>
        }
      />

      {saved ? (
        <Notice tone="allow" live className="mb-4" title={`${saved.name} added`}>
          Next, add the products it sells.{" "}
          <Link href={`/suppliers/${saved.id}`} className="font-medium text-accent hover:underline">
            Open {saved.name}
          </Link>
          .
          {saved.approved ? null : (
            <>
              {" "}
              An owner must also approve it on the{" "}
              <Link href="/mandate" className="font-medium text-accent hover:underline">
                Spend mandate
              </Link>{" "}
              page before orders from it can be paid.
            </>
          )}
        </Notice>
      ) : null}

      <Card aria-labelledby="suppliers-title">
        <CardHeader
          id="suppliers-title"
          title="All suppliers"
          description={!can("manageSuppliers") ? "Read-only: managers and owners can add and edit suppliers." : undefined}
        />
        <CardBody>
          <ResourceView resource={suppliers} hasData={Boolean(items)} loading={<SkeletonRows rows={4} />}>
            {items && items.length === 0 ? (
              <EmptyState
                title="No suppliers yet"
                description="Add the wholesalers you already buy from, with their delivery fees and products."
                action={
                  can("manageSuppliers") ? (
                    <Button variant="primary" onClick={() => setAdding(true)}>
                      Add supplier
                    </Button>
                  ) : undefined
                }
              />
            ) : items ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <caption className="sr-only">Suppliers</caption>
                  <thead className="border-b border-line text-[11.5px] text-ink-3">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Supplier
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Status
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Lead time
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Delivery
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Products
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((s) => {
                      const shipping = s.fee_terms.find((f) => f.kind === "SHIPPING");
                      return (
                        <tr key={s.id}>
                          <td className="py-2.5 pr-3 align-top">
                            <Link href={`/suppliers/${s.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                              {s.name}
                            </Link>
                            {s.website ? <p className="max-w-64 truncate text-[12px] text-ink-3">{s.website}</p> : null}
                          </td>
                          <td className="py-2.5 pr-3 align-top">
                            <SupplierBadges supplier={s} />
                          </td>
                          <td className="tnum py-2.5 pr-3 text-right align-top">{plural(s.lead_time_days, "day")}</td>
                          <td className="tnum py-2.5 pr-3 text-right align-top text-ink-2">
                            {shipping
                              ? `${money(shipping.amount_minor, currency)}${shipping.waived_over_minor !== null ? ` · free over ${money(shipping.waived_over_minor, currency)}` : ""}`
                              : "Free"}
                          </td>
                          <td className="tnum py-2.5 pr-3 text-right align-top">{num(s.catalog_items)}</td>
                          <td className="py-2.5 align-top">
                            <SourceLabel source={s.data_source} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </ResourceView>
        </CardBody>
      </Card>

      {adding ? (
        <SupplierDialog
          currency={currency}
          onClose={() => setAdding(false)}
          onSaved={(s) => {
            setSaved(s);
            suppliers.reload();
          }}
        />
      ) : null}
    </>
  );
}
