/**
 * PayPal JS SDK v6 (web-sdk/v6/core) loader and minimal typings.
 *
 * Only the public client id is ever used in the browser. Orders are created and
 * captured by the Quartermaster API after TrustRail verifies the signed intent
 * certificate; the client never decides that anything is paid.
 */

export type PresentationMode = "auto" | "popup" | "modal" | "redirect" | "payment-handler";

export interface PayPalApproveData {
  orderId: string;
  payerId?: string;
}

export interface PayPalOneTimePaymentSessionOptions {
  onApprove: (data: PayPalApproveData) => Promise<void> | void;
  onCancel?: (data?: { orderId?: string }) => void;
  onError?: (error: unknown) => void;
  onComplete?: (data?: unknown) => void;
}

export interface PayPalOneTimePaymentSession {
  start(options: { presentationMode: PresentationMode }, createOrder?: Promise<{ orderId: string }>): Promise<void>;
  destroy?: () => void;
  cancel?: () => void;
}

export interface PayPalEligibility {
  isEligible(method: "paypal" | "venmo" | "paylater" | "credit" | (string & {})): boolean;
}

export interface PayPalSdkInstance {
  findEligibleMethods(options?: { currencyCode?: string }): Promise<PayPalEligibility>;
  createPayPalOneTimePaymentSession(options: PayPalOneTimePaymentSessionOptions): PayPalOneTimePaymentSession;
}

export interface PayPalV6Namespace {
  createInstance(options: {
    clientId: string;
    components: string[];
    pageType?: "checkout" | "product-details" | "cart" | (string & {});
    locale?: string;
  }): Promise<PayPalSdkInstance>;
}

declare global {
  interface Window {
    paypal?: PayPalV6Namespace;
  }
}

/** Only load SDK code from PayPal's own origins, whatever the config says. */
const ALLOWED_SDK_HOSTS = new Set(["www.sandbox.paypal.com", "www.paypal.com"]);

export function isTrustedSdkUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_SDK_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

let scriptPromise: Promise<PayPalV6Namespace> | null = null;
const instances = new Map<string, Promise<PayPalSdkInstance>>();

function loadScript(src: string): Promise<PayPalV6Namespace> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<PayPalV6Namespace>((resolve, reject) => {
    if (window.paypal?.createInstance) {
      resolve(window.paypal);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.qmPaypal = "v6";
    script.onload = () => {
      if (window.paypal?.createInstance) resolve(window.paypal);
      else reject(new Error("PayPal SDK loaded but window.paypal.createInstance is missing."));
    };
    script.onerror = () => reject(new Error("Could not load the PayPal SDK. Check your network or ad blocker."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    scriptPromise = null; // allow a later retry
    throw error;
  });
  return scriptPromise;
}

/** Loads the SDK once and creates (or reuses) an instance for `clientId`. */
export function getPayPalInstance(sdkUrl: string, clientId: string): Promise<PayPalSdkInstance> {
  if (!isTrustedSdkUrl(sdkUrl)) {
    return Promise.reject(new Error("Refusing to load PayPal SDK from an untrusted URL."));
  }
  const cached = instances.get(clientId);
  if (cached) return cached;
  const created = loadScript(sdkUrl)
    .then((paypal) => paypal.createInstance({ clientId, components: ["paypal-payments"], pageType: "checkout" }))
    .catch((error: unknown) => {
      instances.delete(clientId);
      throw error;
    });
  instances.set(clientId, created);
  return created;
}
