"use client";

import { RouteError } from "@/components/ui/RouteError";

/** Console pages: the shell (sidebar, header, session) stays usable around the failure. */
export default function ConsoleError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} />;
}
