import type { PolicyDecisionKind } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { DECISION_LABELS, DECISION_TONES } from "@/lib/labels";

export function DecisionBadge({ decision, size = "md" }: { decision: PolicyDecisionKind; size?: "sm" | "md" }) {
  return (
    <Badge tone={DECISION_TONES[decision]} dot size={size} label={`TrustRail decision: ${DECISION_LABELS[decision]}`}>
      {DECISION_LABELS[decision]}
    </Badge>
  );
}
