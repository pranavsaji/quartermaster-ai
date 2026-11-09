import type { AiMode } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";

export function AiModeBadge({ mode }: { mode: AiMode }) {
  return mode === "LLM" ? (
    <Badge tone="accent" label="Interpreted by: LLM" title="Interpreted by a language model, validated against a strict schema">
      LLM
    </Badge>
  ) : (
    <Badge tone="review" label="Interpreted by: deterministic fallback" title="No LLM configured or available: deterministic rules were used">
      Deterministic fallback
    </Badge>
  );
}
