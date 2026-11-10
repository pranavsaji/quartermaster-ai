/**
 * Server-side session load for the console layout (server components only).
 *
 * The console used to render a skeleton, then ask the API who is signed in, and only then let
 * pages start their own requests. Loading the session here, with the visitor's cookie, removes
 * that round trip: the shell and pages render with the user, role and public config from the
 * first byte, and pages start fetching immediately.
 *
 * - 401 from /auth/me → redirect to /login?next=… (the cookie is stale or revoked).
 * - API unreachable, slow or failing → `null`: the client loads the session itself as before,
 *   with its own error and Retry, so a hiccup here never blocks the console.
 */
import type { PublicConfig, SessionResponse, SessionUser } from "@qm/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { InitialSession } from "@/components/session/SessionProvider";
import { loginRedirectFor, PATH_HEADER } from "./session-gate";

/** The API origin, from the same environment the `/api` rewrite in next.config.ts uses. */
export function apiOrigin(env: Record<string, string | undefined> = process.env): string {
  const url = env.API_URL ?? (env.API_HOSTPORT ? `http://${env.API_HOSTPORT}` : "http://localhost:4000");
  return url.replace(/\/+$/, "");
}

const TIMEOUT_MS = 5_000;

/** Headers forwarded to the API: the session cookie, plus what the rewrite would also pass on. */
const FORWARDED = ["cookie", "user-agent", "accept-language", "x-forwarded-for"] as const;

type Outcome<T> = { ok: true; value: T } | { ok: false; status: number };

async function getJson<T>(path: string, forward: Headers): Promise<Outcome<T>> {
  try {
    const res = await fetch(`${apiOrigin()}/api/v1${path}`, {
      headers: forward,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, value: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** `/login?next=<the page>` for a request whose session the API rejected. */
export function signInUrl(path: string | null): string {
  const target = path && path.startsWith("/") && !path.startsWith("//") ? path : "/";
  const q = target.indexOf("?");
  const pathname = q === -1 ? target : target.slice(0, q);
  const search = q === -1 ? "" : target.slice(q);
  // `false`: the API said there is no valid session, whatever cookie the browser still holds.
  return loginRedirectFor(pathname, search, false) ?? "/login";
}

function isSessionUser(value: unknown): value is SessionUser {
  if (typeof value !== "object" || value === null) return false;
  const u = value as Partial<SessionUser>;
  return typeof u.id === "string" && typeof u.role === "string" && typeof u.organization === "object" && u.organization !== null;
}

/**
 * The signed-in user and public config for this request, `null` when they couldn't be loaded
 * (the client then loads them), or a redirect to sign in when the API says the session is invalid.
 */
export async function loadInitialSession(): Promise<InitialSession | null> {
  const incoming = await headers();
  const forward = new Headers({ accept: "application/json" });
  for (const name of FORWARDED) {
    const value = incoming.get(name);
    if (value) forward.set(name, value);
  }
  // Like the `/api` proxy (proxy.ts): the API believes the forwarded address only with this.
  if (process.env.EDGE_SECRET) forward.set("x-qm-edge", process.env.EDGE_SECRET);

  const [me, config] = await Promise.all([getJson<SessionResponse>("/auth/me", forward), getJson<PublicConfig>("/config/public", forward)]);
  if (!me.ok && me.status === 401) {
    redirect(signInUrl(incoming.get(PATH_HEADER)));
  }
  if (!me.ok || !config.ok || !isSessionUser(me.value.user)) return null;
  return { user: me.value.user, config: config.value };
}
