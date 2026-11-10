import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountPage } from "@/app/(console)/account/AccountPage";
import { SessionProvider } from "@/components/session/SessionProvider";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { ApiRequestError } from "@/lib/http";
import { isReadOnlySample, SAMPLE_READONLY_MESSAGE, userCan } from "@/lib/roles";
import { sessionUser, testSession } from "./helpers";

const sampleOwner = () => {
  const user = sessionUser("OWNER");
  return { ...user, organization: { ...user.organization, read_only_sample: true } };
};

describe("shared sample workspace", () => {
  it("hides account, team, mandate and supplier changes but keeps the purchasing journey", () => {
    const owner = sampleOwner();
    expect(isReadOnlySample(owner)).toBe(true);
    for (const c of ["editMandate", "manageSuppliers", "manageTeam"] as const) expect(userCan(owner, c)).toBe(false);
    for (const c of ["approve", "pay", "createRequest", "runResearch", "analyzeInvoices", "manageDeliveries"] as const) {
      expect(userCan(owner, c)).toBe(true);
    }
    // An ordinary workspace (or an older API without the flag) is unaffected.
    expect(isReadOnlySample(sessionUser("OWNER"))).toBe(false);
    expect(userCan(sessionUser("OWNER"), "manageTeam")).toBe(true);
  });

  it("explains a SAMPLE_WORKSPACE_READONLY refusal in plain words", () => {
    render(
      <ErrorNotice
        error={new ApiRequestError({ status: 403, code: "SAMPLE_WORKSPACE_READONLY", message: "server text", correlationId: "c-1" })}
      />,
    );
    expect(screen.getByText("Read-only in the shared sample workspace")).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_READONLY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText("You don't have permission")).not.toBeInTheDocument();
  });

  it("replaces the password form on the account page", () => {
    const session = testSession("OWNER");
    render(
      <SessionProvider session={{ ...session, user: sampleOwner(), can: (c) => userCan(sampleOwner(), c) }}>
        <AccountPage />
      </SessionProvider>,
    );
    expect(screen.getByText(SAMPLE_READONLY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change password" })).not.toBeInTheDocument();
  });

  it("keeps the password form in an ordinary workspace", () => {
    render(
      <SessionProvider session={testSession("OWNER")}>
        <AccountPage />
      </SessionProvider>,
    );
    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
  });
});
