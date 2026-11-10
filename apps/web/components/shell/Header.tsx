"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Popover } from "@/components/ui/Popover";
import { useSession } from "@/components/session/SessionProvider";
import { describeError } from "@/lib/http";
import { lookup } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/roles";
import { Icons } from "./icons";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

type ServiceState = "on" | "off" | "sandbox";

function ServiceRow({ name, state, detail }: { name: string; state: ServiceState; detail: string }) {
  return (
    <li className="flex items-start gap-2.5 px-2.5 py-2">
      <span
        aria-hidden
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", state === "on" ? "bg-allow" : state === "sandbox" ? "bg-accent" : "bg-ink-4")}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">
          {name}
          <span className="sr-only">: </span>
          <span className="ml-1.5 text-xs font-normal text-ink-3">{state === "on" ? "On" : state === "sandbox" ? "Sandbox" : "Off"}</span>
        </span>
        <span className="block text-xs text-ink-3">{detail}</span>
      </span>
    </li>
  );
}

/**
 * The environment in one chip: "Sandbox" (or "Live") with the services behind it in a popover,
 * instead of a row of status pills competing with the page.
 */
function EnvironmentChip() {
  const { config } = useSession();
  const paypal: ServiceState = !config.paypal.enabled ? "off" : config.paypal.environment === "sandbox" ? "sandbox" : "on";
  const sandbox = paypal !== "on";
  return (
    <Popover
      label={sandbox ? "Sandbox environment details" : "Environment details"}
      trigger={
        <>
          <span aria-hidden className={cn("size-1.5 rounded-full", sandbox ? "bg-accent" : "bg-allow")} />
          {sandbox ? "Sandbox" : "Live"}
          <Icons.chevronDown className="size-3.5 text-current opacity-70" />
        </>
      }
      triggerClassName={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset transition-colors",
        sandbox ? "bg-accent-soft text-accent-strong ring-accent-line hover:bg-accent-soft/70" : "bg-allow-soft text-allow ring-allow-line",
      )}
      panelClassName="w-72"
    >
      <p className="px-2.5 pt-1.5 text-xs font-semibold text-ink">{sandbox ? "Sandbox: no real money moves" : "Live environment"}</p>
      <ul className="mt-1">
        <ServiceRow
          name="PayPal"
          state={paypal}
          detail={
            paypal === "off"
              ? "Not set up on this server: payments are unavailable."
              : paypal === "sandbox"
                ? "Test checkout with PayPal sandbox accounts."
                : "Real payments."
          }
        />
        <ServiceRow
          name="AI model"
          state={config.ai.enabled ? "on" : "off"}
          detail={config.ai.enabled ? "Reads requests and writes recommendations." : "Fixed rules read requests instead."}
        />
        <ServiceRow
          name="Market prices"
          state={config.market_data.enabled ? "on" : "off"}
          detail={
            config.market_data.enabled ? "Channel3 public listings, for reference only." : "Prices are judged without a market reference."
          }
        />
      </ul>
      {sandbox ? (
        <p className="mx-2.5 mt-1 mb-1.5 border-t border-line pt-2 text-2xs text-ink-3">
          Suppliers are sandbox merchants; deliveries are simulated.
        </p>
      ) : null}
    </Popover>
  );
}

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, signOut, signingOut, signOutError } = useSession();
  const roleLabel = lookup(ROLE_LABELS, user.role, user.role);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="-ml-1.5 grid size-9 place-items-center rounded-md text-ink-2 hover:bg-ink/5 md:hidden pointer-coarse:size-11"
          aria-label="Open navigation"
        >
          <Icons.menu />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{user.organization.name}</p>
          <p className="truncate text-2xs text-ink-3">
            {user.organization.timezone.replace(/_/g, " ")} · {user.organization.currency}
          </p>
        </div>

        <div className="hidden sm:block">
          <EnvironmentChip />
        </div>

        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          <span
            aria-hidden
            className="hidden size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong ring-1 ring-accent-line lg:grid"
          >
            {initials(user.name)}
          </span>
          <div className="hidden min-w-0 leading-tight lg:block">
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <span className="max-w-44 truncate">{user.name}</span>
              <Badge tone={user.role === "OWNER" ? "accent" : "neutral"} label={`Role: ${roleLabel}`}>
                {roleLabel}
              </Badge>
            </p>
            <p className="max-w-64 truncate text-2xs text-ink-3" title={user.email}>
              {user.email}
            </p>
          </div>
          <span className="lg:hidden">
            <Badge tone={user.role === "OWNER" ? "accent" : "neutral"} label={`Role: ${roleLabel}`}>
              {roleLabel}
            </Badge>
          </span>
          <Button variant="ghost" size="sm" onClick={signOut} loading={signingOut} aria-label="Sign out" title="Sign out">
            {!signingOut ? <Icons.signOut className="size-4" /> : null}
            <span className="hidden xl:inline">Sign out</span>
          </Button>
        </div>
      </div>
      {signOutError ? (
        <p role="alert" className="border-t border-block-line bg-block-soft px-4 py-2 text-xs text-block sm:px-6">
          Couldn&apos;t sign out: {describeError(signOutError)} You are still signed in; try again.
        </p>
      ) : null}
    </header>
  );
}
