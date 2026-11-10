import type { ProcurementRequestDto } from "@qm/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequestDetail } from "@/app/(console)/procurement/[id]/RequestDetail";
import { jsonResponse, mockFetch, policyDecision, purchaseOrder, renderWithSession, violation } from "./helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function request(overrides: Partial<ProcurementRequestDto> = {}): ProcurementRequestDto {
  return {
    id: "req-1",
    status: "READY_FOR_REVIEW",
    instruction: "Restock takeaway containers without exceeding $300.",
    currency: "USD",
    budget_limit_minor: 30000,
    required_by: null,
    allow_alternatives: true,
    intent: null,
    forecast: null,
    market: [],
    candidates: [],
    proposals: [],
    active_proposal_id: null,
    recommendation: null,
    security_findings: [],
    agent_steps: [],
    created_by: "u-1",
    created_at: "2026-11-09T10:00:00.000Z",
    updated_at: "2026-11-09T10:01:00.000Z",
    ...overrides,
  };
}

describe("RequestDetail", () => {
  it("puts the approvable proposal first and the blocked cart under Evidence", async () => {
    const approvable = purchaseOrder({ id: "po-ok", number: "PO-1002", created_at: "2026-11-09T10:00:02.000Z" });
    const blocked = purchaseOrder({
      id: "po-bad",
      number: "PO-1001",
      supplier_name: "QuickServe Packaging Co.",
      status: "BLOCKED",
      created_at: "2026-11-09T10:00:01.000Z",
      policy_decision: policyDecision({
        id: "dec-bad",
        decision: "BLOCK",
        violations: [violation({ code: "UNAUTHORIZED_LINE_ITEM", severity: "BLOCK", message: "Priority service charge is not allowed." })],
      }),
    });
    mockFetch({
      "GET /api/v1/procurement/requests/req-1": [jsonResponse(request({ proposals: [approvable, blocked] }))],
      "GET /api/v1/inventory": [jsonResponse({ items: [] })],
    });

    renderWithSession(<RequestDetail id="req-1" />);

    expect(await screen.findByRole("heading", { name: "Procurement request" })).toBeInTheDocument();
    expect(screen.getByText("Restock takeaway containers without exceeding $300.")).toBeInTheDocument();
    // The jump goes straight to the first card waiting for approval.
    expect(screen.getByRole("link", { name: "Review 1 proposal" })).toHaveAttribute("href", "#po-po-ok");

    const live = within(screen.getByRole("region", { name: "Proposals" })).getAllByRole("article");
    expect(live.map((c) => within(c).getByRole("heading", { level: 3 }).textContent)).toEqual(["Harbor Foodservice"]);
    expect(within(live[0]!).getByRole("button", { name: "Approve & sign" })).toBeDisabled();

    const evidence = within(screen.getByRole("region", { name: "Evidence" })).getAllByRole("article");
    expect(evidence.map((c) => within(c).getByRole("heading", { level: 3 }).textContent)).toEqual(["QuickServe Packaging Co."]);
    expect(within(evidence[0]!).getByText("TrustRail blocked this cart")).toBeInTheDocument();
    // The reason reads in plain words first; the code is kept behind "Technical details".
    expect(within(evidence[0]!).getAllByText(/Charge not in the supplier's terms/).length).toBeGreaterThan(0);
    expect(within(evidence[0]!).queryByRole("button", { name: "Approve & sign" })).not.toBeInTheDocument();
  });

  it("shows a replaced cart as replaced, not as blocked, and counts only TrustRail's blocks", async () => {
    const replaced = purchaseOrder({
      id: "po-old",
      number: "PO-1001",
      supplier_name: "Coastal Foods",
      status: "SUPERSEDED",
      created_at: "2026-11-09T10:00:01.000Z",
      policy_decision: policyDecision({ id: "dec-old", decision: "REVIEW_REQUIRED" }),
    });
    const current = purchaseOrder({ id: "po-new", number: "PO-1002", created_at: "2026-11-09T10:00:02.000Z" });
    mockFetch({
      "GET /api/v1/procurement/requests/req-1": [jsonResponse(request({ proposals: [replaced, current] }))],
      "GET /api/v1/inventory": [jsonResponse({ items: [] })],
    });
    renderWithSession(<RequestDetail id="req-1" />);

    const evidence = await screen.findByRole("region", { name: "Evidence" });
    expect(within(evidence).getByText("Replaced by a newer cart")).toBeInTheDocument();
    expect(screen.queryByText("TrustRail blocked this cart")).not.toBeInTheDocument();
    expect(screen.queryByText(/blocked by TrustRail/)).not.toBeInTheDocument();
    expect(within(evidence).getByText("Proposal: Replaced")).toBeInTheDocument();
  });

  it("reloads the request when research is refused with a 409, so a run started elsewhere is picked up", async () => {
    const { calls } = mockFetch({
      "GET /api/v1/procurement/requests/req-1": [
        jsonResponse(request({ status: "DRAFT" })),
        jsonResponse(request({ status: "RESEARCHING" })),
      ],
      "GET /api/v1/inventory": [jsonResponse({ items: [] })],
      "POST /api/v1/procurement/requests/req-1/research": [
        jsonResponse({ error: { code: "RESEARCH_IN_PROGRESS", message: "Research is already running for this request." } }, 409),
      ],
    });
    renderWithSession(<RequestDetail id="req-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Run research" }));

    expect(await screen.findByText("Research is already running for this request.")).toBeInTheDocument();
    expect(screen.getByText("Research didn't start")).toBeInTheDocument();
    await waitFor(() => expect(calls.filter((c) => c.method === "GET" && c.url.includes("/procurement/requests/req-1"))).toHaveLength(2));
    expect(await screen.findByText("Request: Researching")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reload request" }));
    await waitFor(() => expect(calls.filter((c) => c.method === "GET" && c.url.includes("/procurement/requests/req-1"))).toHaveLength(3));
  });

  it("reloads the request when re-evaluation is refused with a 409", async () => {
    const { calls } = mockFetch({
      "GET /api/v1/procurement/requests/req-1": [jsonResponse(request())],
      "GET /api/v1/inventory": [jsonResponse({ items: [] })],
      "POST /api/v1/procurement/requests/req-1/evaluate": [
        jsonResponse({ error: { code: "REQUEST_NOT_APPROVABLE", message: "This request has no open proposals to evaluate." } }, 409),
      ],
    });
    renderWithSession(<RequestDetail id="req-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Re-evaluate" }));

    expect(await screen.findByText("This request has no open proposals to evaluate.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload request" })).toBeInTheDocument();
    await waitFor(() => expect(calls.filter((c) => c.method === "GET" && c.url.includes("/procurement/requests/req-1"))).toHaveLength(2));
  });

  it("turns a request that doesn't exist into a friendly dead end with a way back", async () => {
    mockFetch({
      "GET /api/v1/procurement/requests/req-1": [
        jsonResponse({ error: { code: "NOT_FOUND", message: "Procurement request not found", correlation_id: "corr-404" } }, 404),
      ],
      "GET /api/v1/inventory": [jsonResponse({ items: [] })],
    });
    renderWithSession(<RequestDetail id="req-1" />);
    expect(await screen.findByText("We couldn't find that request")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to requests" })).toHaveAttribute("href", "/procurement");
    expect(screen.queryByText("corr-404")).not.toBeInTheDocument();
  });

  it("shows the API's error with a retry when the request can't be loaded", async () => {
    mockFetch({
      "GET /api/v1/procurement/requests/req-1": [
        jsonResponse({ error: { code: "INTERNAL", message: "Something went wrong on our side." } }, 500),
      ],
      "GET /api/v1/inventory": [jsonResponse({ items: [] })],
    });
    renderWithSession(<RequestDetail id="req-1" />);
    expect(await screen.findByText("Couldn't load this request")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong on our side.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
