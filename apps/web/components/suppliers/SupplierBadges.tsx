import type { SupplierDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";

/** Approval, activity, checkout and quarantine state of a supplier, as compact pills. */
export function SupplierBadges({ supplier: s }: { supplier: SupplierDto }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {s.approved ? (
        <Badge tone="allow" dot>
          Approved
        </Badge>
      ) : (
        <Badge tone="neutral" dot title="Only approved suppliers can be paid. Owners approve suppliers on the Spend mandate page.">
          Not approved
        </Badge>
      )}
      {!s.active ? <Badge tone="review">Inactive</Badge> : null}
      {!s.checkout_eligible ? <Badge tone="neutral">No PayPal checkout</Badge> : null}
      {s.quarantined ? <Badge tone="block">Quarantined</Badge> : null}
    </span>
  );
}
