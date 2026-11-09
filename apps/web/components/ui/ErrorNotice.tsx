import { ApiRequestError, describeError } from "@/lib/http";
import { Button } from "./Button";
import { Notice } from "./Notice";

/**
 * Renders an API failure: the server's message, its error code and the
 * correlation id (so an operator can find the request in the API logs).
 * Only a role denial gets the "ask the owner" explanation; every other 403
 * (CSRF, "only the approving owner can pay", disabled actions) shows the
 * server's own reason.
 */
export function ErrorNotice({
  error,
  onRetry,
  retryLabel = "Retry",
  title,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  /** The action's label, e.g. "Reload request" when the fix is to fetch fresh data rather than repeat. */
  retryLabel?: string;
  title?: string;
  className?: string;
}) {
  if (!error) return null;
  const apiError = error instanceof ApiRequestError ? error : null;
  const roleDenied = apiError?.isRoleDenied ?? false;
  const heading = title ?? (roleDenied ? "You don't have permission" : "Something went wrong");

  return (
    <Notice
      tone={roleDenied ? "review" : "block"}
      title={heading}
      live
      className={className}
      action={
        onRetry && !apiError?.isForbidden ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined
      }
    >
      <p>
        {describeError(error)}
        {roleDenied ? " Ask the restaurant owner if you need access." : null}
      </p>
      {apiError && (apiError.correlationId || apiError.code) ? (
        <p className="mt-1 font-mono text-[11.5px] text-ink-3">
          {apiError.code ? <span>{apiError.code}</span> : null}
          {apiError.correlationId ? (
            <span>
              {apiError.code ? " · " : ""}correlation id <span className="select-all text-ink-2">{apiError.correlationId}</span>
            </span>
          ) : null}
        </p>
      ) : null}
    </Notice>
  );
}
