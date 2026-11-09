import type { PolicyDecisionKind } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { DECISION_LABELS, DECISION_TONES, lookup } from "@/lib/labels";

export function DecisionBadge({ decision, size = "md" }: { decision: PolicyDecisionKind; size?: "sm" | "md" }) {
  const label = lookup(DECISION_LABELS, decision, decision);
  return (
    <Badge tone={lookup(DECISION_TONES, decision, "neutral")} dot size={size} label={`TrustRail decision: ${label}`}>
      {label}
    </Badge>
  );
}
