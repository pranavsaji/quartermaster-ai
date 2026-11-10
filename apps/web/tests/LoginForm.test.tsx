import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/LoginForm";
import { jsonResponse, mockFetch, PUBLIC_CONFIG, sessionUser } from "./helpers";

const config = (overrides: Partial<typeof PUBLIC_CONFIG> = {}) => ({
  "GET /api/v1/config/public": [jsonResponse({ ...PUBLIC_CONFIG, ...overrides })],
});
const loginCalls = (calls: { method: string; url: string }[]) => calls.filter((c) => c.method === "POST" && c.url.endsWith("/auth/login"));

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("next=/orders"),
}));

function fill(email: string, password: string) {
  fireEvent.change(screen.getByRole("textbox", { name: /Email/ }), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: password } });
}

describe("LoginForm", () => {
  it("stays busy after signing in so a second click can't submit again", async () => {
    const { calls } = mockFetch({ ...config(), "POST /api/v1/auth/login": [jsonResponse({ user: sessionUser() })] });
    render(<LoginForm />);
    fill("owner@demo.quartermaster.dev", "a-long-password");
    const button = screen.getByRole("button", { name: "Sign in" });
    fireEvent.click(button);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders"));
    // Navigation hasn't replaced the page yet: the button is still busy and disabled.
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.submit(button.closest("form")!);
    expect(loginCalls(calls)).toHaveLength(1);
  });

  it("announces field errors and focuses the first invalid field", async () => {
    const { calls } = mockFetch(config());
    render(<LoginForm />);
    fill("not-an-email", "short");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("There are 2 problems to fix");
    await waitFor(() => expect(screen.getByRole("textbox", { name: /Email/ })).toHaveFocus());
    expect(loginCalls(calls)).toHaveLength(0);
  });

  it("links to sign-up and the reset page, and lists sample accounts only when the deployment says so", async () => {
    mockFetch(config());
    const { unmount } = render(<LoginForm />);
    expect(await screen.findByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByText(/Sample workspace/)).not.toBeInTheDocument();
    unmount();

    mockFetch(config({ sample_accounts_hint: true, accounts: { signup_enabled: false, email_enabled: false } }));
    render(<LoginForm />);
    expect(await screen.findByText(/Sample workspace/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });
});
