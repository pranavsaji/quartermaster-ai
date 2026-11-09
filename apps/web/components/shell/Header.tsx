"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/session/SessionProvider";
import { describeError } from "@/lib/http";
import { lookup } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/roles";
import { Icons } from "./icons";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, config, signOut, signingOut, signOutError } = useSession();
  const sandbox = config.paypal.environment === "sandbox";
  const roleLabel = lookup(ROLE_LABELS, user.role, user.role);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="-ml-1 rounded-md p-1.5 text-ink-2 hover:bg-ink/5 lg:hidden"
          aria-label="Open navigation"
        >
          <Icons.menu />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-ink">{user.organization.name}</p>
          <p className="truncate text-[11.5px] text-ink-3">
            {user.organization.timezone} · {user.organization.currency}
          </p>
        </div>

        <div className="hidden items-center gap-1.5 xl:flex" role="group" aria-label="Environment status">
          {!config.paypal.enabled ? (
            <Badge tone="neutral" title="PayPal is not configured on this server; payments are unavailable">
              PayPal off
            </Badge>
          ) : sandbox ? (
            <Badge tone="accent" title="PayPal sandbox: no real money moves">
              PayPal sandbox
            </Badge>
          ) : null}
          <Badge
            tone={config.ai.enabled ? "allow" : "review"}
            title={config.ai.enabled ? "LLM assistance enabled" : "Running in deterministic mode — no LLM configured"}
          >
            {config.ai.enabled ? "AI: LLM" : "AI: deterministic"}
          </Badge>
          <Badge
            tone={config.market_data.enabled ? "info" : "neutral"}
            title={config.market_data.enabled ? "Channel3 market data enabled" : "Channel3 market data is disabled"}
          >
            {config.market_data.enabled ? "Channel3 on" : "Channel3 off"}
          </Badge>
        </div>

        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          <span
            aria-hidden
            className="hidden size-8 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-strong ring-1 ring-accent-line lg:grid"
          >
            {initials(user.name)}
          </span>
          <div className="hidden leading-tight lg:block">
            <p className="max-w-40 truncate text-[13px] font-medium text-ink">{user.name}</p>
            <p className="max-w-40 truncate text-[11.5px] text-ink-3">{user.email}</p>
          </div>
          <Badge tone={user.role === "OWNER" ? "accent" : "neutral"} label={`Role: ${roleLabel}`}>
            {roleLabel}
          </Badge>
          <Button variant="ghost" size="sm" onClick={signOut} loading={signingOut} aria-label="Sign out">
            {!signingOut ? <Icons.signOut className="size-4" /> : null}
            <span className="hidden md:inline">Sign out</span>
          </Button>
        </div>
      </div>
      {signOutError ? (
        <p role="alert" className="border-t border-block-line bg-block-soft px-4 py-2 text-[12.5px] text-block sm:px-6">
          Couldn&apos;t sign out: {describeError(signOutError)} You are still signed in; try again.
        </p>
      ) : null}
    </header>
  );
}
