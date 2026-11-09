"use client";

import type { PublicConfig, SessionUser } from "@qm/contracts";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { ApiRequestError } from "@/lib/http";
import { useResource } from "@/lib/hooks";
import { userCan, type Capability } from "@/lib/roles";

export interface Session {
  user: SessionUser;
  config: PublicConfig;
  can: (capability: Capability) => boolean;
  signOut: () => Promise<void>;
  signingOut: boolean;
  /** Why the last sign-out attempt failed; the user is still signed in. */
  signOutError: unknown;
}

const SessionContext = createContext<Session | null>(null);

/** What the server layout loaded for the console (lib/server-session). */
export interface InitialSession {
  user: SessionUser;
  config: PublicConfig;
}

export interface SessionLoadState {
  session: Session | null;
  loading: boolean;
  error: unknown;
  retry: () => void;
}

/**
 * The public config and the signed-in user for the console. The console layout normally loads
 * them on the server (`initial`), so nothing is fetched here; when it couldn't, they are loaded
 * from the client, and `retry` always re-reads them. A 401 from `/auth/me` is handled by the HTTP
 * layer (redirect to /login).
 */
export function useLoadSession(initial?: InitialSession | null): SessionLoadState {
  const resource = useResource(
    async (signal) => {
      const [config, me] = await Promise.all([api.config.public({ signal }), api.auth.me({ signal })]);
      return { config, user: me.user };
    },
    [],
    { initialData: initial ?? undefined },
  );
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<unknown>(undefined);

  // Only leave the console once the API has ended the session: navigating away after a
  // failed logout would leave a live session cookie behind while looking signed out.
  const signOut = useCallback(async () => {
    setSigningOut(true);
    setSignOutError(undefined);
    try {
      await api.auth.logout();
    } catch (err) {
      // 401: the session had already ended, which is what we wanted.
      if (!(err instanceof ApiRequestError && err.isUnauthorized)) {
        setSignOutError(err);
        setSigningOut(false);
        return;
      }
    }
    // A full page load (not router.push) so no cached data from this session survives.
    window.location.replace("/login");
  }, []);

  const session = useMemo<Session | null>(() => {
    if (!resource.data) return null;
    const { user, config } = resource.data;
    return { user, config, can: (c) => userCan(user, c), signOut, signingOut, signOutError };
  }, [resource.data, signOut, signingOut, signOutError]);

  return { session, loading: resource.loading, error: resource.error, retry: resource.reload };
}

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside the console layout");
  return ctx;
}
