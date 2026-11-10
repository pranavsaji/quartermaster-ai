import type { ReactNode } from "react";
import { Brand } from "@/components/shell/Sidebar";

const STEPS: [string, string][] = [
  ["Deterministic spend policy", "Every cart is checked against your mandate: suppliers, categories, limits, market price, duplicates."],
  ["Human approval, signed", "Your approval mints an Ed25519-signed Intent Certificate bound to the exact cart hash."],
  ["Verified before PayPal", "Payment is only created if the certificate still verifies — any change to the cart voids it."],
];

/** Two-column frame for the signed-out pages: the form on the left, how TrustRail works on the right. */
export function AuthLayout({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10">
            <Brand />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          {description ? <p className="mt-1.5 mb-8 text-sm text-ink-3">{description}</p> : <div className="mb-8" />}
          {children}
        </div>
      </main>

      <aside className="relative hidden overflow-hidden border-l border-line bg-ink lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:32px_32px]"
        />
        <div className="relative max-w-md text-white">
          <p className="text-[12px] font-semibold tracking-[0.08em] text-white/50 uppercase">How TrustRail works</p>
          <ol className="mt-6 space-y-6">
            {STEPS.map(([heading, body], i) => (
              <li key={heading} className="flex gap-4">
                <span className="tnum grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-[13px] font-semibold ring-1 ring-white/20">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">{heading}</p>
                  <p className="mt-1 text-sm text-white/60">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

/** Small text link row under an auth form ("Already have an account? Sign in"). */
export function AuthFootnote({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-center text-[13px] text-ink-3">{children}</p>;
}
