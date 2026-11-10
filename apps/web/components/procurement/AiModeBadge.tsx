import type { AiMode } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";

export function AiModeBadge({ mode }: { mode: AiMode }) {
  return mode === "LLM" ? (
    <Badge tone="accent" label="Written by: AI model" title="Written by a language model and checked against a strict schema">
      AI model
    </Badge>
  ) : (
    <Badge tone="review" label="Written by: fixed rules" title="No AI model was available, so fixed rules were used instead">
      Fixed rules
    </Badge>
  );
}
