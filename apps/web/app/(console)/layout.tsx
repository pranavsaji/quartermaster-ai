import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { loadInitialSession } from "@/lib/server-session";

/**
 * Loads the session on the server with the visitor's cookie, so the shell and the page render
 * with the user and role straight away instead of waiting for a client round trip. Redirects to
 * sign in when the API rejects the session; if the API can't be reached the client loads it.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const initialSession = await loadInitialSession();
  return <ConsoleShell initialSession={initialSession}>{children}</ConsoleShell>;
}
