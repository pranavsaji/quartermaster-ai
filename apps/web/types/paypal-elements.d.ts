/**
 * JSX typing for the PayPal JS SDK v6 web components.
 * The SDK registers <paypal-button> as a custom element once it loads.
 */
import type { DetailedHTMLProps, HTMLAttributes } from "react";

type PayPalButtonAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  type?: "pay" | "checkout" | "buynow" | "subscribe" | "donate";
  hidden?: boolean;
  disabled?: boolean;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": PayPalButtonAttributes;
    }
  }
}
