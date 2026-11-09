"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { Icons, type IconName } from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Operate",
    items: [
      { href: "/", label: "Overview", icon: "overview" },
      { href: "/procurement", label: "Procurement", icon: "procurement" },
      { href: "/approvals", label: "Approvals", icon: "approvals" },
      { href: "/inventory", label: "Inventory", icon: "inventory" },
      { href: "/orders", label: "Orders & invoices", icon: "orders" },
    ],
  },
  {
    heading: "Govern",
    items: [
      { href: "/mandate", label: "Spend mandate", icon: "mandate" },
      { href: "/security", label: "Security center", icon: "security" },
      { href: "/analytics", label: "Analytics", icon: "analytics" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-ink text-white shadow-sm ring-1 ring-ink/10"
      >
        <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M4 7.5 10 4l6 3.5v5L10 16l-6-3.5v-5Z" strokeLinejoin="round" />
          <path d="M7 11.2 10 13l3-1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-[-0.01em] text-ink">Quartermaster</span>
        <span className="flex items-center gap-1 text-[11.5px] font-medium text-ink-3">
          <Icons.shield className="size-3 text-allow" strokeWidth={2} />
          Secured by TrustRail
        </span>
      </span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Primary" className="flex flex-col gap-6">
      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-[0.06em] text-ink-4 uppercase">{group.heading}</p>
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
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                      active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
                    )}
                  >
                    <Icon className={cn("size-[18px]", active ? "text-accent" : "text-ink-3")} />
                    {item.label}
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
