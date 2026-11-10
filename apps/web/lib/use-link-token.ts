"use client";

import { useSyncExternalStore } from "react";
import { hashTokenSnapshot } from "./link-token";

const subscribe = () => () => undefined;

/**
 * The one-time token from the page's `#token=…` fragment. `undefined` while rendering on the
 * server and during hydration (the fragment only exists in the browser), then the token or null.
 */
export function useLinkToken(): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(subscribe, hashTokenSnapshot, () => undefined);
}
