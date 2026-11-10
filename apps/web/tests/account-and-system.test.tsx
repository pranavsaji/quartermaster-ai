import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OpsHealthDto, SystemErrorDto } from "@qm/contracts";
import { describe, expect, it, vi } from "vitest";
import { SystemPage } from "@/app/(console)/system/SystemPage";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { ItemDialog } from "@/components/inventory/ItemDialog";
import { SessionProvider } from "@/components/session/SessionProvider";
import { isInvitationCreated, isResetLink } from "@/lib/response-guards";
import { inventoryItem, jsonResponse, mockFetch, testSession } from "./helpers";

const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("ChangePasswordForm", () => {
  it("marks a wrong current password on its field instead of signing out", async () => {
    mockFetch({
      "POST /api/v1/auth/password/change": [
        jsonResponse({ error: { code: "INVALID_CURRENT_PASSWORD", message: "Current password is incorrect." } }, 400),
      ],
    });
    render(<ChangePasswordForm />);
    type(/Current password/, "old one");
    type(/^New password/, "a new long passphrase");
    type(/Confirm new password/, "a new long passphrase");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findAllByText("That isn't your current password.")).not.toHaveLength(0);
    expect(screen.getByLabelText(/Current password/)).toHaveAttribute("aria-invalid", "true");
  });

  it("changes the password and clears the fields", async () => {
    const { calls } = mockFetch({ "POST /api/v1/auth/password/change": [jsonResponse({ status: "changed" })] });
    render(<ChangePasswordForm />);
    type(/Current password/, "the old passphrase");
    type(/^New password/, "a new long passphrase");
    type(/Confirm new password/, "a new long passphrase");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText(/Password changed/)).toBeInTheDocument();
    expect(calls[0]!.body).toEqual({ current_password: "the old passphrase", new_password: "a new long passphrase" });
    expect(screen.getByLabelText(/Current password/)).toHaveValue("");
  });

  it("refuses reusing the current password", () => {
    const { calls } = mockFetch({});
    render(<ChangePasswordForm />);
    type(/Current password/, "same long passphrase");
    type(/^New password/, "same long passphrase");
    type(/Confirm new password/, "same long passphrase");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getAllByText("Choose a password different from the current one.").length).toBeGreaterThan(0);
    expect(calls).toHaveLength(0);
  });
});

describe("ItemDialog", () => {
  it("creates an item with its starting stock", async () => {
    const { calls } = mockFetch({ "POST /api/v1/inventory": [jsonResponse({ item: inventoryItem({ id: "inv-9" }) }, 201)] });
    const onSaved = vi.fn();
    render(<ItemDialog suppliers={[]} onClose={() => undefined} onSaved={onSaved} />);
    type(/^Name/, "Frying oil");
    type(/^SKU/, "ING-OIL");
    type(/^Unit/, "liter");
    type(/On hand now/, "14");
    type(/Safety stock/, "10");
    type(/Market search/, "canola frying oil jug");
    type(/Keywords/, "oil, Fryer oil");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls[0]!.body).toMatchObject({ sku: "ING-OIL", on_hand: 14, safety_stock: 10, keywords: ["oil", "fryer oil"] });
  });

  it("edits details with PUT and never sends stock on hand", async () => {
    const item = inventoryItem({ search_query: "takeout boxes", keywords: ["boxes"] });
    const { calls } = mockFetch({ "PUT /api/v1/inventory/inv-1": [jsonResponse({ item })] });
    render(<ItemDialog item={item} suppliers={[]} onClose={() => undefined} onSaved={() => undefined} />);
    expect(screen.queryByLabelText(/On hand now/)).not.toBeInTheDocument();
    type(/Safety stock/, "6");
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.body).toMatchObject({ safety_stock: 6, search_query: "takeout boxes", keywords: ["boxes"] });
    expect(calls[0]!.body).not.toHaveProperty("on_hand");
  });
});

const health: OpsHealthDto = {
  error_tracking: { open_errors: 1, sentry: false },
  alerting: { email: true, webhook: false, recipients: 2 },
  email: { enabled: true, provider: "resend" },
  paypal_webhooks: { last_received_at: null, received_24h: 0, rejected_24h: 0 },
  payments: { capture_pending: 0, oldest_pending_minutes: null },
};
const error: SystemErrorDto = {
  id: "err-1",
  fingerprint: "fp",
  source: "api",
  level: "error",
  code: "INTERNAL",
  message: "unhandled error",
  route: "POST /api/v1/suppliers",
  occurrences: 3,
  first_seen_at: "2026-11-09T09:00:00.000Z",
  last_seen_at: "2026-11-09T10:00:00.000Z",
  last_correlation_id: "corr-1",
  last_alerted_at: null,
  resolved_at: null,
};

function renderAs(operator: boolean) {
  const session = testSession("OWNER");
  return render(
    <SessionProvider session={{ ...session, user: { ...session.user, operator } }}>
      <SystemPage />
    </SessionProvider>,
  );
}

describe("SystemPage", () => {
  it("is for operators only", () => {
    const { calls } = mockFetch({});
    renderAs(false);
    expect(screen.getByText("Operators only")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("shows health, lists errors, resolves one and sends a test alert", async () => {
    const { calls } = mockFetch({
      "GET /api/v1/ops/health": [jsonResponse(health)],
      "GET /api/v1/ops/errors": [jsonResponse({ items: [error], next_cursor: null }), jsonResponse({ items: [], next_cursor: null })],
      "POST /api/v1/ops/errors/err-1/resolve": [jsonResponse({ error: { ...error, resolved_at: "2026-11-09T10:05:00.000Z" } })],
      "POST /api/v1/ops/alerts/test": [jsonResponse({ email_recipients: 2, emails_sent: 2, webhook_sent: false })],
    });
    renderAs(true);
    expect(await screen.findByText("unhandled error")).toBeInTheDocument();
    expect(screen.getByText(/3 occurrences/)).toBeInTheDocument();
    expect(await screen.findByText("Email")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resolve INTERNAL" }));
    expect(await screen.findByText("No open errors")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send test alert" }));
    expect(await screen.findByText("Test alert sent")).toBeInTheDocument();
    expect(screen.getByText(/Email: 2 of 2 recipients/)).toBeInTheDocument();
    expect(calls.find((c) => c.url.includes("/ops/errors?"))!.url).toContain("status=OPEN");
  });
});

describe("one-time link guards", () => {
  const invitation = { id: "inv-1", email: "a@b.example" };
  it("accept links whose token is in the fragment", () => {
    expect(isInvitationCreated({ invitation, invite_url: "https://app.example/invite#token=abc", email_sent: false })).toBe(true);
    expect(isResetLink({ reset_url: "https://app.example/reset-password#token=abc", expires_at: "x", email_sent: true })).toBe(true);
  });

  it("reject anything else", () => {
    expect(isInvitationCreated({ invitation, invite_url: "https://app.example/invite?token=abc", email_sent: false })).toBe(false);
    expect(isInvitationCreated({ invitation, invite_url: "javascript:alert(1)#token=abc", email_sent: false })).toBe(false);
    expect(isInvitationCreated({ invitation, invite_url: "https://app.example/invite#token=", email_sent: false })).toBe(false);
    expect(isResetLink({ reset_url: "not a url", expires_at: "x", email_sent: true })).toBe(false);
    expect(isResetLink({ reset_url: null, expires_at: "x", email_sent: true })).toBe(true);
    expect(isResetLink({ reset_url: null, expires_at: "x", email_sent: false })).toBe(false);
    expect(isResetLink(null)).toBe(false);
  });
});
