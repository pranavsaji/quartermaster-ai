import { ApiRequestError, describeError } from "@/lib/http";
import { Button } from "./Button";
import { Notice } from "./Notice";

/**
 * Renders an API failure: the server's message, its error code and the
 * correlation id (so an operator can find the request in the API logs).
 * 403s get a consistent "You don't have permission" message.
 */
export function ErrorNotice({
  error,
  onRetry,
  title,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  if (!error) return null;
  const apiError = error instanceof ApiRequestError ? error : null;
  const forbidden = apiError?.isForbidden ?? false;
  const heading = title ?? (forbidden ? "You don't have permission" : "Something went wrong");
  const message = forbidden
    ? "Your role doesn't allow this action. Ask the restaurant owner if you need access."
    : describeError(error);

  return (
    <Notice
      tone={forbidden ? "review" : "block"}
      title={heading}
      live
      className={className}
      action={
        onRetry && !forbidden ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      <p>{message}</p>
      {apiError && (apiError.correlationId || apiError.code) ? (
        <p className="mt-1 font-mono text-[11.5px] text-ink-3">
          {apiError.code ? <span>{apiError.code}</span> : null}
          {apiError.correlationId ? (
            <span>
              {apiError.code ? " · " : ""}correlation id{" "}
              <span className="select-all text-ink-2">{apiError.correlationId}</span>
            </span>
          ) : null}
        </p>
      ) : null}
    </Notice>
  );
}
