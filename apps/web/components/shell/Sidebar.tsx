"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/session/SessionProvider";
import { cn } from "@/components/ui/cn";
import { Icons, type IconName } from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Only platform operators see this entry (the API refuses everyone else anyway). */
  operatorOnly?: boolean;
}

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Operate",
    items: [
      { href: "/", label: "Overview", icon: "overview" },
      { href: "/procurement", label: "Procurement", icon: "procurement" },
      { href: "/approvals", label: "Approvals", icon: "approvals" },
      { href: "/inventory", label: "Inventory", icon: "inventory" },
      { href: "/suppliers", label: "Suppliers", icon: "suppliers" },
      { href: "/orders", label: "Orders & invoices", icon: "orders" },
      { href: "/deliveries", label: "Delivery schedule", icon: "schedule" },
    ],
  },
  {
    heading: "Govern",
    items: [
      { href: "/mandate", label: "Spend mandate", icon: "mandate" },
      { href: "/security", label: "Security center", icon: "security" },
      { href: "/red-team", label: "Red-team TrustRail", icon: "redteam" },
      { href: "/analytics", label: "Analytics", icon: "analytics" },
    ],
  },
  {
    heading: "Workspace",
    items: [
      { href: "/team", label: "Team", icon: "team" },
      { href: "/account", label: "Your account", icon: "account" },
      { href: "/system", label: "System health", icon: "system", operatorOnly: true },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg px-1 py-1" aria-label={compact ? "Quartermaster overview" : undefined}>
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-ink text-white shadow-sm ring-1 ring-ink/10">
        <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M4 7.5 10 4l6 3.5v5L10 16l-6-3.5v-5Z" strokeLinejoin="round" />
          <path d="M7 11.2 10 13l3-1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={cn("leading-tight", compact && "hidden lg:inline")}>
        <span className="block text-base font-semibold tracking-[-0.01em] text-ink">Quartermaster</span>
        <span className="flex items-center gap-1 text-2xs font-medium text-ink-3">
          <Icons.shield className="size-3 text-allow" strokeWidth={2} />
          Secured by TrustRail
        </span>
      </span>
    </Link>
  );
}

/** Navigation; `rail` shows icons only on tablets (md–lg), with each label as a tooltip and accessible name. */
export function SidebarNav({ onNavigate, rail = false }: { onNavigate?: () => void; rail?: boolean }) {
  const pathname = usePathname() ?? "/";
  const { user } = useSession();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.operatorOnly || user.operator) }));
  return (
    <nav aria-label="Primary" className="flex min-h-0 flex-col gap-6 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.heading}>
          <p
            className={cn("mb-1.5 px-2.5 text-2xs font-semibold tracking-[0.06em] text-ink-4 uppercase", rail && "sr-only lg:not-sr-only")}
          >
            {group.heading}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = Icons[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={rail ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors pointer-coarse:py-3",
                      rail && "justify-center lg:justify-start",
                      active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
                    )}
                  >
                    <Icon className={cn("size-[18px]", active ? "text-accent" : "text-ink-3")} />
                    <span className={cn(rail && "sr-only lg:not-sr-only")}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
