import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditLog } from "@/components/security/AuditLog";
import { roleCan } from "@/lib/roles";
import { jsonResponse, mockFetch, renderWithSession } from "./helpers";

describe("AuditLog verification", () => {
  it("is a manager-or-owner capability", () => {
    expect(roleCan("OWNER", "verifyAudit")).toBe(true);
    expect(roleCan("MANAGER", "verifyAudit")).toBe(true);
    expect(roleCan("VIEWER", "verifyAudit")).toBe(false);
  });

  it("hides the verify button from viewers, with an explanation", () => {
    mockFetch({});
    renderWithSession(<AuditLog events={[]} />, { role: "VIEWER" });
    expect(screen.queryByRole("button", { name: "Verify audit chain" })).not.toBeInTheDocument();
    expect(screen.getByText(/Managers and owners can re-verify the audit chain/)).toBeInTheDocument();
  });

  it("lets a manager verify the chain", async () => {
    mockFetch({
      "GET /api/v1/security/audit/verify": [jsonResponse({ valid: true, events_checked: 12, first_invalid_sequence: null })],
    });
    renderWithSession(<AuditLog events={[]} />, { role: "MANAGER" });
    fireEvent.click(screen.getByRole("button", { name: "Verify audit chain" }));
    await waitFor(() => expect(screen.getByText("Audit chain intact")).toBeInTheDocument());
  });
});
