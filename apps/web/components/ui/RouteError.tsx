"use client";

import Link from "next/link";
import { useEffect } from "react";
import { errorReporter } from "@/lib/error-reporting";
import { ApiRequestError } from "@/lib/http";
import { Button } from "./Button";
import { Notice } from "./Notice";

/**
 * Fallback for a route segment that threw while rendering. Shows an API
 * failure's own message and correlation id, but never a raw exception message
 * (which can contain internals); the server digest is shown for support. The error is reported
 * to the API's error tracking (API failures are already recorded server-side, so they are not).
 */
export function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    if (!(error instanceof ApiRequestError)) errorReporter.report(error, "render", { digest: error.digest });
  }, [error]);

  const apiError = error instanceof ApiRequestError ? error : null;
  // A reference only helps support with a server failure or a crash, not with an API refusal that explains itself.
  const reference = apiError ? (apiError.isAmbiguous ? apiError.correlationId : null) : (error.digest ?? null);

  return (
    <div className="mx-auto mt-16 max-w-lg px-4">
      <Notice
        tone="block"
        live
        title="This page hit an unexpected problem"
        action={
          <Button size="sm" variant="secondary" onClick={retry}>
            Try again
          </Button>
        }
      >
        <p>
          {apiError
            ? apiError.message
            : "Something went wrong while showing this page. Your data is safe; try again or go back to the overview."}
        </p>
        {reference ? (
          <p className="mt-1 font-mono text-2xs text-ink-3">
            reference <span className="select-all text-ink-2">{reference}</span>
          </p>
        ) : null}
      </Notice>
      <p className="mt-4 text-center text-sm">
        <Link href="/" className="font-medium text-accent hover:underline">
          Back to the overview
        </Link>
      </p>
    </div>
  );
}
