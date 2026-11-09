"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Skeleton } from "@/components/ui/Skeleton";
import { SessionProvider, useLoadSession } from "@/components/session/SessionProvider";
import { Header } from "./Header";
import { Icons } from "./icons";
import { Brand, SidebarNav } from "./Sidebar";

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" role="status" aria-label="Loading Quartermaster">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-canvas p-4 lg:block">
        <Skeleton className="mb-8 h-9 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <div className="flex-1">
        <div className="h-14 border-b border-line bg-surface" />
        <div className="space-y-4 p-6">
          <Skeleton className="h-7 w-56" />
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}

/**
 * Authenticated console frame: persistent left sidebar (drawer below lg),
 * sticky header with org/user/role, and the session context for pages.
 */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const { session, loading, error, retry } = useLoadSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (loading || (!session && !error)) return <ShellSkeleton />;
  if (!session) {
    return (
      <div className="mx-auto mt-24 max-w-lg px-4">
        <ErrorNotice error={error} onRetry={retry} title="Couldn't load your workspace" />
      </div>
    );
  }

  return (
    <SessionProvider session={session}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-ink px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-canvas px-3 py-4 lg:flex">
          <div className="mb-7 px-1">
            <Brand />
          </div>
          <SidebarNav />
          <SidebarFooter />
        </aside>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-canvas px-3 py-4 shadow-[var(--shadow-pop)]">
              <div className="mb-7 flex items-center justify-between px-1">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md p-1.5 text-ink-2 hover:bg-ink/5"
                  aria-label="Close navigation"
                >
                  <Icons.close />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
              <SidebarFooter />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header onOpenMenu={() => setMenuOpen(true)} />
          <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto rounded-lg border border-line bg-surface px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-3">
      Payments run in <span className="font-medium text-ink-2">PayPal sandbox</span>. Suppliers are sandbox merchants;
      deliveries are synthetic.
    </div>
  );
}
