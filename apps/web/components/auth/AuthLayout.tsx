import type { ReactNode } from "react";
import { Brand } from "@/components/shell/Sidebar";

const STEPS: [string, string][] = [
  [
    "Your rules, every cart",
    "Each cart is checked against your spend mandate: suppliers, categories, limits, market price and repeat orders.",
  ],
  ["Nothing is bought without you", "Approving signs an Intent Certificate for that exact cart, at that exact total."],
  [
    "Checked again before PayPal",
    "If anything in the cart changes after you approve, the certificate no longer matches and payment stops.",
  ],
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

      <aside className="relative hidden overflow-hidden border-l border-line bg-ink lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="relative max-w-md text-white">
          <p className="text-xs font-semibold tracking-[0.08em] text-white/60 uppercase">How TrustRail works</p>
          <p className="mt-3 text-xl leading-snug font-semibold tracking-[-0.01em]">
            An agent that does the restocking legwork, and a rail that keeps it to your rules.
          </p>
          <ol className="mt-8 space-y-6">
            {STEPS.map(([heading, body], i) => (
              <li key={heading} className="flex gap-4">
                <span className="tnum grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold ring-1 ring-white/20">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">{heading}</p>
                  <p className="mt-1 text-sm text-white/70">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          {/* A sample of what the owner sees when TrustRail refuses a cart. */}
          <div aria-hidden className="mt-10 rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-[#fda29b]">
              <span className="size-1.5 rounded-full bg-[#f97066]" />
              TrustRail blocked a cart
            </p>
            <p className="mt-1.5 text-sm text-white/80">
              QuickServe Packaging Co. added a $24.50 &ldquo;priority service charge&rdquo; that isn&apos;t in its terms.
            </p>
            <p className="mt-1 text-xs text-white/50">Nothing was paid. A cart from another supplier was proposed instead.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Small text link row under an auth form ("Already have an account? Sign in"). */
export function AuthFootnote({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-center text-sm text-ink-3">{children}</p>;
}
