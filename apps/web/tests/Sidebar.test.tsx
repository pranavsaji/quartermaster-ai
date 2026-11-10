import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionProvider } from "@/components/session/SessionProvider";
import { SidebarNav } from "@/components/shell/Sidebar";
import { testSession } from "./helpers";

vi.mock("next/navigation", () => ({ usePathname: () => "/suppliers/sup-1" }));

function renderNav(operator: boolean) {
  const session = testSession("MANAGER");
  render(
    <SessionProvider session={{ ...session, user: { ...session.user, operator } }}>
      <SidebarNav />
    </SessionProvider>,
  );
}

describe("SidebarNav", () => {
  it("links suppliers, team and account, and marks the current section", () => {
    renderNav(false);
    expect(screen.getByRole("link", { name: "Suppliers" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute("href", "/team");
    expect(screen.getByRole("link", { name: "Your account" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "System health" })).not.toBeInTheDocument();
  });

  it("shows System health to operators", () => {
    renderNav(true);
    expect(screen.getByRole("link", { name: "System health" })).toHaveAttribute("href", "/system");
  });
});
