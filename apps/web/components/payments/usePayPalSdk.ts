"use client";

import type { PublicConfig } from "@qm/contracts";
import { useCallback, useEffect, useState } from "react";
import { getPayPalInstance, type PayPalSdkInstance } from "@/lib/paypal";

export type PayPalSdkState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "ready"; sdk: PayPalSdkInstance }
  | { status: "ineligible" }
  | { status: "error"; error: unknown };

/** Loads the v6 SDK and checks PayPal eligibility for `currency`. */
export function usePayPalSdk(
  config: PublicConfig["paypal"],
  currency: string,
): { state: PayPalSdkState; retry: () => void } {
  const clientId = config.enabled ? config.client_id : null;
  const [attempt, setAttempt] = useState(0);
  // The outcome of one load attempt; any other key means a newer attempt is still loading.
  const key = `${clientId}|${config.sdk_url}|${currency}|${attempt}`;
  const [result, setResult] = useState<{ key: string; state: PayPalSdkState } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      let state: PayPalSdkState;
      try {
        const sdk = await getPayPalInstance(config.sdk_url, clientId);
        const eligibility = await sdk.findEligibleMethods({ currencyCode: currency });
        state = eligibility.isEligible("paypal") ? { status: "ready", sdk } : { status: "ineligible" };
      } catch (error) {
        state = { status: "error", error };
      }
      if (!cancelled) setResult({ key, state });
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, config.sdk_url, currency, key]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const state: PayPalSdkState = !clientId
    ? { status: "disabled" }
    : result && result.key === key
      ? result.state
      : { status: "loading" };
  return { state, retry };
}
