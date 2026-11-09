import { describeError } from "@/lib/http";
import { Button } from "./Button";
import { Notice } from "./Notice";

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * Compact notice for a background refresh that failed while older data is
 * still on screen, so the page never silently shows stale numbers as current.
 * Renders nothing unless there is both an error and data.
 */
export function RefreshErrorNotice({
  error,
  hasData,
  updatedAt,
  onRetry,
  className,
}: {
  error: unknown;
  hasData: boolean;
  updatedAt: number | undefined;
  onRetry?: () => void;
  className?: string;
}) {
  if (!error || !hasData) return null;
  const since = updatedAt ? ` — showing data from ${timeFmt.format(updatedAt)}` : " — showing the last data loaded";
  return (
    <Notice
      tone="review"
      live
      className={className}
      title={`Couldn't refresh${since}`}
      action={
        onRetry ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      {describeError(error)}
    </Notice>
  );
}
