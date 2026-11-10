import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "@/app/forgot-password/ForgotPasswordForm";
import { AcceptInvitation } from "@/app/invite/AcceptInvitation";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { SignupForm } from "@/app/signup/SignupForm";
import { resetHashToken } from "@/lib/link-token";
import { jsonResponse, mockFetch, PUBLIC_CONFIG, sessionUser } from "./helpers";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const TOKEN = "Tok_0123456789abcdefghijKLMNOP";
const config = (overrides: Partial<typeof PUBLIC_CONFIG> = {}) => ({
  "GET /api/v1/config/public": [jsonResponse({ ...PUBLIC_CONFIG, ...overrides })],
});
const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

afterEach(() => {
  resetHashToken();
  replace.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("SignupForm", () => {
  it("validates before sending: password length and confirmation, name, restaurant", async () => {
    const { calls } = mockFetch(config());
    render(<SignupForm />);
    type(/^Password/, "short");
    type(/Confirm password/, "short");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText(/There are \d problems to fix/)).toBeInTheDocument();
    expect(screen.getAllByText("Use at least 12 characters.").length).toBeGreaterThan(0);
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);

    type(/^Password/, "a long enough passphrase");
    type(/Confirm password/, "a different passphrase");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getAllByText("The passwords don't match.").length).toBeGreaterThan(0);
  });

  it("creates the workspace with sample data by default and opens the console", async () => {
    const { calls } = mockFetch({ ...config(), "POST /api/v1/auth/signup": [jsonResponse({ user: sessionUser() }, 201)] });
    render(<SignupForm />);
    type(/Your name/, "Dana Owner");
    type(/Work email/, "Dana@Bistro.example");
    type(/^Password/, "a long enough passphrase");
    type(/Confirm password/, "a long enough passphrase");
    type(/Restaurant name/, "Dana's Bistro");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    const body = calls.find((c) => c.method === "POST")!.body as Record<string, unknown>;
    expect(body).toMatchObject({
      name: "Dana Owner",
      email: "dana@bistro.example",
      organization_name: "Dana's Bistro",
      sample_data: true,
    });
    expect(typeof body.timezone).toBe("string");
  });

  it("shows the API's reason when the email is taken", async () => {
    mockFetch({
      ...config(),
      "POST /api/v1/auth/signup": [
        jsonResponse({ error: { code: "EMAIL_IN_USE", message: "An account with this email already exists." } }, 409),
      ],
    });
    render(<SignupForm />);
    type(/Your name/, "Dana");
    type(/Work email/, "dana@bistro.example");
    type(/^Password/, "a long enough passphrase");
    type(/Confirm password/, "a long enough passphrase");
    type(/Restaurant name/, "Bistro");
    fireEvent.click(screen.getByRole("checkbox", { name: /sample data/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("says sign-up is closed when the deployment turned it off", async () => {
    mockFetch(config({ accounts: { signup_enabled: false, email_enabled: false } }));
    render(<SignupForm />);
    expect(await screen.findByText("Sign-up is closed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
  });
});

describe("ForgotPasswordForm", () => {
  it("explains owner-issued links when this deployment can't send email", async () => {
    mockFetch(config());
    render(<ForgotPasswordForm />);
    expect(await screen.findByText("Ask an owner for a reset link")).toBeInTheDocument();
  });

  it("confirms without saying whether the account exists", async () => {
    const { calls } = mockFetch({
      ...config({ accounts: { signup_enabled: true, email_enabled: true } }),
      "POST /api/v1/auth/password/forgot": [jsonResponse({ status: "sent" }, 202)],
    });
    render(<ForgotPasswordForm />);
    fireEvent.change(await screen.findByLabelText(/Email/), { target: { value: "who@bistro.example" } });
    fireEvent.click(screen.getByRole("button", { name: "Email me a reset link" }));
    expect(await screen.findByText(/If an account exists for who@bistro.example/)).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ email: "who@bistro.example" });
  });
});

describe("ResetPasswordForm", () => {
  it("reads the token from the fragment, clears it from the address bar and sends it with the new password", async () => {
    window.history.replaceState(null, "", `/reset-password#token=${TOKEN}`);
    const { calls } = mockFetch({ "POST /api/v1/auth/password/reset": [jsonResponse({ status: "reset" })] });
    render(<ResetPasswordForm />);
    expect(window.location.hash).toBe("");
    type(/^New password/, "brand new passphrase");
    type(/Confirm new password/, "brand new passphrase");
    fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
    expect(await screen.findByText("Password changed")).toBeInTheDocument();
    expect(calls[0]!.body).toEqual({ token: TOKEN, password: "brand new passphrase" });
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("treats a missing token, or one in the query string, as an unusable link", () => {
    window.history.replaceState(null, "", `/reset-password?token=${TOKEN}`);
    mockFetch({});
    render(<ResetPasswordForm />);
    expect(screen.getByText("This reset link can't be used")).toBeInTheDocument();
  });

  it("explains an expired or used link", async () => {
    window.history.replaceState(null, "", `/reset-password#token=${TOKEN}`);
    mockFetch({
      "POST /api/v1/auth/password/reset": [
        jsonResponse({ error: { code: "RESET_LINK_INVALID", message: "This reset link is invalid or has expired." } }, 400),
      ],
    });
    render(<ResetPasswordForm />);
    type(/^New password/, "brand new passphrase");
    type(/Confirm new password/, "brand new passphrase");
    fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
    expect(await screen.findByText("This reset link can't be used")).toBeInTheDocument();
  });
});

describe("AcceptInvitation", () => {
  const invitation = {
    organization_name: "Saffron & Sage Kitchen",
    email: "chef@bistro.example",
    role: "MANAGER",
    invited_by_name: "Dana Owner",
    expires_at: "2026-11-16T10:00:00.000Z",
  };

  it("shows who invited whom, then creates the login and opens the console", async () => {
    window.history.replaceState(null, "", `/invite#token=${TOKEN}`);
    const { calls } = mockFetch({
      "POST /api/v1/invitations/lookup": [jsonResponse({ invitation })],
      "POST /api/v1/invitations/accept": [jsonResponse({ user: sessionUser("MANAGER") }, 201)],
    });
    render(<AcceptInvitation />);
    expect(await screen.findByText("Saffron & Sage Kitchen")).toBeInTheDocument();
    expect(screen.getByText(/Dana Owner invited/)).toHaveTextContent("Dana Owner invited chef@bistro.example to join as Manager.");
    type(/Your name/, "  Sam Chef ");
    type(/^Password/, "a long enough passphrase");
    type(/Confirm password/, "a long enough passphrase");
    fireEvent.click(screen.getByRole("button", { name: "Join Saffron & Sage Kitchen" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(calls[0]!.body).toEqual({ token: TOKEN });
    expect(calls[1]!.body).toEqual({ token: TOKEN, name: "Sam Chef", password: "a long enough passphrase" });
  });

  it("explains an invalid invitation", async () => {
    window.history.replaceState(null, "", `/invite#token=${TOKEN}`);
    mockFetch({
      "POST /api/v1/invitations/lookup": [jsonResponse({ error: { code: "INVITATION_INVALID", message: "Not found" } }, 404)],
    });
    render(<AcceptInvitation />);
    expect(await screen.findByText("This invitation can't be used")).toBeInTheDocument();
  });
});
