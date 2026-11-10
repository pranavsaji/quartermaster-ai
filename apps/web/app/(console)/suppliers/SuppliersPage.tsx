"use client";

import type { SupplierDetailDto } from "@qm/contracts";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { SupplierDialog } from "@/components/suppliers/SupplierDialog";
import { SuppliersGrid } from "@/components/suppliers/SuppliersGrid";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
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
            {can("manageSuppliers") ? (
              <Button variant="primary" onClick={() => setAdding(true)}>
                Add supplier
              </Button>
            ) : null}
            <RefreshButton onClick={suppliers.reload} loading={suppliers.refreshing} />
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
              <SuppliersGrid suppliers={items} currency={currency} />
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
