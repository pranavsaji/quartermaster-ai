import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/LoginForm";
import { jsonResponse, mockFetch, sessionUser } from "./helpers";

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
    const { fetchMock } = mockFetch({ "POST /api/v1/auth/login": [jsonResponse({ user: sessionUser() })] });
    render(<LoginForm />);
    fill("owner@demo.quartermaster.dev", "a-long-password");
    const button = screen.getByRole("button", { name: "Sign in" });
    fireEvent.click(button);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders"));
    // Navigation hasn't replaced the page yet: the button is still busy and disabled.
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.submit(button.closest("form")!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("announces field errors and focuses the first invalid field", async () => {
    const { fetchMock } = mockFetch({});
    render(<LoginForm />);
    fill("not-an-email", "short");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("There are 2 problems to fix");
    await waitFor(() => expect(screen.getByRole("textbox", { name: /Email/ })).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
