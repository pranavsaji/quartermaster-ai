"use client";

import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Skeleton } from "@/components/ui/Skeleton";
import { SessionProvider, useLoadSession, type InitialSession } from "@/components/session/SessionProvider";
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
 *
 * `initialSession` comes from the server layout, so pages render and start their own requests
 * straight away; without it (the API was unreachable from the server) the session loads here.
 */
export function ConsoleShell({ initialSession, children }: { initialSession?: InitialSession | null; children: ReactNode }) {
  const { session, loading, error, retry } = useLoadSession(initialSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);
  // Close the drawer after any navigation (adjusting state during render, not in an effect).
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

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

        <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

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

/**
 * Navigation drawer below lg, on the native modal <dialog> like ui/Dialog: focus
 * moves into it, Tab is contained, Escape closes it, the page behind is inert,
 * and focus returns to the menu button on close.
 */
function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!el.open) el.showModal();
    // At lg the drawer is hidden by CSS; don't leave an invisible modal making the page inert.
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onResize = () => desktop.matches && onCloseEvent();
    desktop.addEventListener("change", onResize);
    // A click on the dialog element itself is a click on the backdrop (Escape covers keyboards).
    const onBackdropClick = (e: MouseEvent) => e.target === el && onCloseEvent();
    el.addEventListener("click", onBackdropClick);
    return () => {
      desktop.removeEventListener("change", onResize);
      el.removeEventListener("click", onBackdropClick);
      if (el.open) el.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Navigation"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] bg-canvas p-0 shadow-[var(--shadow-pop)] lg:hidden"
    >
      {open ? (
        <div className="flex h-full flex-col px-3 py-4">
          <div className="mb-7 flex items-center justify-between px-1">
            <Brand />
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-ink-2 hover:bg-ink/5" aria-label="Close navigation">
              <Icons.close />
            </button>
          </div>
          <SidebarNav onNavigate={onClose} />
          <SidebarFooter />
        </div>
      ) : null}
    </dialog>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto rounded-lg border border-line bg-surface px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-3">
      Payments run in <span className="font-medium text-ink-2">PayPal sandbox</span>. Suppliers are sandbox merchants; deliveries are
      synthetic.
    </div>
  );
}
