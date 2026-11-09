"use client";

import { RouteError } from "@/components/ui/RouteError";

/** Errors outside the console shell (sign-in) and in the console layout itself. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} />;
}
