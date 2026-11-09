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
  const enabled = config.enabled && Boolean(config.client_id);
  const [state, setState] = useState<PayPalSdkState>(enabled ? { status: "loading" } : { status: "disabled" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const clientId = config.client_id;
    if (!enabled || !clientId) {
      setState({ status: "disabled" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const sdk = await getPayPalInstance(config.sdk_url, clientId);
        const eligibility = await sdk.findEligibleMethods({ currencyCode: currency });
        if (cancelled) return;
        setState(eligibility.isEligible("paypal") ? { status: "ready", sdk } : { status: "ineligible" });
      } catch (error) {
        if (!cancelled) setState({ status: "error", error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, config.client_id, config.sdk_url, currency, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, retry };
}
