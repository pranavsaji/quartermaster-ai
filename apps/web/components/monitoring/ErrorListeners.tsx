"use client";

import { useEffect } from "react";
import { errorReporter, type ErrorReporter } from "@/lib/error-reporting";

/**
 * Reports errors no React boundary sees: uncaught exceptions in event handlers and timers
 * (`error`) and unhandled promise rejections. Renders nothing. Mounted once in the root layout.
 */
export function ErrorListeners({ reporter = errorReporter }: { reporter?: ErrorReporter }) {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reporter.report(event.error ?? event.message, "unhandled");
    const onRejection = (event: PromiseRejectionEvent) => reporter.report(event.reason, "rejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [reporter]);
  return null;
}
