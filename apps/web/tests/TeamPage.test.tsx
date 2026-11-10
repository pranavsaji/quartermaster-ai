import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { InvitationDto, MemberDto } from "@qm/contracts";
import { describe, expect, it } from "vitest";
import { TeamPage } from "@/app/(console)/team/TeamPage";
import { jsonResponse, mockFetch, renderWithSession } from "./helpers";

const me: MemberDto = {
  user_id: "u-1",
  email: "owner@bistro.example",
  name: "Dana Owner",
  role: "OWNER",
  joined_at: "2026-11-01T10:00:00.000Z",
  is_self: true,
};
const chef: MemberDto = { ...me, user_id: "u-2", email: "chef@bistro.example", name: "Sam Chef", role: "MANAGER", is_self: false };
const invitation: InvitationDto = {
  id: "inv-1",
  email: "new@bistro.example",
  role: "VIEWER",
  status: "PENDING",
  invited_by_name: "Dana Owner",
  created_at: "2026-11-09T10:00:00.000Z",
  expires_at: "2026-11-16T10:00:00.000Z",
};
const LINK = "https://app.example/invite#token=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

describe("TeamPage", () => {
  it("lets an owner invite someone and shows the one-time link once", async () => {
    const { calls } = mockFetch({
      "GET /api/v1/members": [jsonResponse({ members: [me, chef], invitations: [] })],
      "POST /api/v1/members/invitations": [jsonResponse({ invitation, invite_url: LINK, email_sent: false }, 201)],
    });
    renderWithSession(<TeamPage />);
    expect(await screen.findByText("Sam Chef")).toBeInTheDocument();
    expect(screen.getByText("No pending invitations")).toBeInTheDocument();

    const form = screen.getByRole("form", { name: "Invite someone" });
    fireEvent.change(within(form).getByLabelText(/Email/), { target: { value: "New@Bistro.example" } });
    fireEvent.change(within(form).getByLabelText(/Role/), { target: { value: "VIEWER" } });
    fireEvent.click(within(form).getByRole("button", { name: "Send invitation" }));

    expect(await screen.findByText("Invitation ready for new@bistro.example")).toBeInTheDocument();
    expect(screen.getByText(/Email isn't set up on this deployment/)).toBeInTheDocument();
    expect(screen.getByTitle(LINK)).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ email: "new@bistro.example", role: "VIEWER" });
    // The new invitation is listed as pending, with a revoke action.
    expect(screen.getByRole("button", { name: "Revoke invitation for new@bistro.example" })).toBeInTheDocument();
  });

  it("refuses to treat an answer without a usable link as an invitation", async () => {
    mockFetch({
      "GET /api/v1/members": [jsonResponse({ members: [me], invitations: [] })],
      "POST /api/v1/members/invitations": [
        jsonResponse({ invitation, invite_url: "https://app.example/invite?token=x", email_sent: true }, 201),
      ],
    });
    renderWithSession(<TeamPage />);
    const form = await screen.findByRole("form", { name: "Invite someone" });
    fireEvent.change(within(form).getByLabelText(/Email/), { target: { value: "new@bistro.example" } });
    fireEvent.click(within(form).getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByText("Couldn't invite them")).toBeInTheDocument();
    expect(screen.queryByText(/Invitation ready/)).not.toBeInTheDocument();
  });

  it("changes a role and shows the API's refusal for the last owner", async () => {
    const { calls } = mockFetch({
      "GET /api/v1/members": [jsonResponse({ members: [me, chef], invitations: [] })],
      "PUT /api/v1/members/u-1/role": [
        jsonResponse({ error: { code: "LAST_OWNER", message: "A workspace needs at least one owner." } }, 409),
      ],
      "PUT /api/v1/members/u-2/role": [jsonResponse({ member: { ...chef, role: "OWNER" } })],
    });
    renderWithSession(<TeamPage />);
    fireEvent.change(await screen.findByLabelText("Role for Sam Chef"), { target: { value: "OWNER" } });
    await waitFor(() => expect(screen.getByLabelText("Role for Sam Chef")).toHaveValue("OWNER"));
    fireEvent.change(screen.getByLabelText("Role for Dana Owner"), { target: { value: "VIEWER" } });
    expect(await screen.findByText("A workspace needs at least one owner.")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "PUT").map((c) => c.body)).toEqual([{ role: "OWNER" }, { role: "VIEWER" }]);
  });

  it("issues a reset link and removes a member after confirmation", async () => {
    const { calls } = mockFetch({
      "GET /api/v1/members": [jsonResponse({ members: [me, chef], invitations: [] }), jsonResponse({ members: [me], invitations: [] })],
      "POST /api/v1/members/u-2/password-reset": [
        jsonResponse({
          reset_url: "https://app.example/reset-password#token=abcdefghijklmnopqrstuvwxyz012345",
          expires_at: "2026-11-09T11:00:00.000Z",
          email_sent: false,
        }),
      ],
      "POST /api/v1/members/u-2/remove": [new Response(null, { status: 204 })],
    });
    renderWithSession(<TeamPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Reset link for Sam Chef" }));
    expect(await screen.findByText("Reset link ready for chef@bistro.example")).toBeInTheDocument();
    expect(screen.getByText(/copy the link and send it to chef@bistro.example yourself/)).toBeInTheDocument();
    // Owners get no reset link (it would take over a co-owner's account).
    expect(screen.queryByRole("button", { name: "Reset link for Dana Owner" })).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Remove Dana Owner" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Sam Chef" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove from workspace" }));
    await waitFor(() => expect(screen.queryByText("Sam Chef")).not.toBeInTheDocument());
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/members/u-2/remove"))).toBe(true);
  });

  it("does not reveal a reset link that was emailed to the member", async () => {
    mockFetch({
      "GET /api/v1/members": [jsonResponse({ members: [me, chef], invitations: [] })],
      "POST /api/v1/members/u-2/password-reset": [
        jsonResponse({ reset_url: null, expires_at: "2026-11-09T11:00:00.000Z", email_sent: true }),
      ],
    });
    renderWithSession(<TeamPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Reset link for Sam Chef" }));
    expect(await screen.findByText("Reset link sent to chef@bistro.example")).toBeInTheDocument();
    expect(screen.getByText(/We emailed the link to chef@bistro.example/)).toBeInTheDocument();
    expect(screen.queryByTitle(/reset-password#token=/)).not.toBeInTheDocument();
  });

  it("is read-only for managers", async () => {
    mockFetch({ "GET /api/v1/members": [jsonResponse({ members: [me, chef], invitations: [] })] });
    renderWithSession(<TeamPage />, { role: "MANAGER" });
    expect(await screen.findByText("Sam Chef")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Invite someone" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Role for Sam Chef")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
  });
});
