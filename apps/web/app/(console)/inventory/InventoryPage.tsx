"use client";

import type { InventoryItemDto } from "@qm/contracts";
import { useCallback, useMemo, useState } from "react";
import { AdjustmentDialog } from "@/components/inventory/AdjustmentDialog";
import { ForecastPanel } from "@/components/inventory/ForecastPanel";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { ItemDialog } from "@/components/inventory/ItemDialog";
import { useSession } from "@/components/session/SessionProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceView } from "@/components/ui/ResourceView";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api } from "@/lib/api";
import { useResource } from "@/lib/hooks";

export function InventoryPage() {
  const { can } = useSession();
  const inventory = useResource((signal) => api.inventory.list({ signal }), []);
  const [adjusting, setAdjusting] = useState<InventoryItemDto | null>(null);
  // `null` item = adding a new one.
  const [editing, setEditing] = useState<{ item: InventoryItemDto | null } | null>(null);
  const canEdit = can("editInventory");
  const suppliers = useResource((signal) => api.suppliers.list({ signal }), [], { enabled: canEdit });
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const items = inventory.data?.items;
  const counts = useMemo(() => {
    const c = { OK: 0, LOW: 0, CRITICAL: 0, OUT: 0 };
    for (const i of items ?? []) c[i.status] += 1;
    return c;
  }, [items]);

  const onAdjust = useCallback((item: InventoryItemDto) => {
    setSavedMessage(null);
    setAdjusting(item);
  }, []);
  const onEdit = useCallback((item: InventoryItemDto) => {
    setSavedMessage(null);
    setEditing({ item });
  }, []);

  const setInventory = inventory.setData;
  const replaceItem = useCallback(
    (updated: InventoryItemDto) => {
      setInventory((prev) => ({ items: (prev?.items ?? []).map((i) => (i.id === updated.id ? updated : i)) }));
    },
    [setInventory],
  );
  const onSaved = useCallback(
    (updated: InventoryItemDto) => {
      replaceItem(updated);
      setSavedMessage(`${updated.name} adjusted — now ${updated.on_hand} ${updated.unit} on hand.`);
    },
    [replaceItem],
  );

  const onDetailsSaved = useCallback(
    (saved: InventoryItemDto) => {
      setInventory((prev) => {
        const list = prev?.items ?? [];
        return { items: list.some((i) => i.id === saved.id) ? list.map((i) => (i.id === saved.id ? saved : i)) : [...list, saved] };
      });
      setSavedMessage(`${saved.name} saved.`);
    },
    [setInventory],
  );

  const source = items?.[0]?.data_source;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock on hand, what's inbound and how many days each item will last at current usage."
        meta={source ? <SourceLabel source={source} /> : null}
        actions={
          <>
            <Button variant="secondary" onClick={inventory.reload} loading={inventory.refreshing}>
              Refresh
            </Button>
            {canEdit ? (
              <Button variant="primary" onClick={() => setEditing({ item: null })}>
                Add item
              </Button>
            ) : null}
          </>
        }
      />

      {savedMessage ? (
        <Notice tone="allow" live className="mb-4">
          {savedMessage}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_420px]">
        <Card aria-labelledby="inventory-title" className="min-w-0">
          <CardHeader
            id="inventory-title"
            title="Stock levels"
            description={!can("adjustInventory") ? "Read-only: managers and owners can adjust stock." : undefined}
            actions={
              items ? (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Stock status counts">
                  <Badge tone="block" dot>
                    {counts.OUT + counts.CRITICAL} critical / out
                  </Badge>
                  <Badge tone="review" dot>
                    {counts.LOW} low
                  </Badge>
                  <Badge tone="allow" dot>
                    {counts.OK} OK
                  </Badge>
                </div>
              ) : null
            }
          />
          <div className="p-3">
            <ResourceView resource={inventory} hasData={Boolean(items)}>
              <InventoryGrid
                items={items}
                canAdjust={can("adjustInventory")}
                onAdjust={onAdjust}
                canEdit={canEdit}
                onEdit={onEdit}
                onItemSaved={replaceItem}
              />
            </ResourceView>
          </div>
        </Card>

        <ForecastPanel canRun={can("runForecast")} />
      </div>

      {editing ? (
        <ItemDialog
          item={editing.item ?? undefined}
          suppliers={suppliers.data?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={onDetailsSaved}
        />
      ) : null}
      {adjusting ? (
        <AdjustmentDialog item={adjusting} onClose={() => setAdjusting(null)} onSaved={onSaved} onItemChanged={replaceItem} />
      ) : null}
    </>
  );
}
