import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequestComposer } from "@/components/procurement/RequestComposer";
import { jsonResponse, mockFetch } from "./helpers";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

describe("RequestComposer", () => {
  it("creates the request once and stays busy while the detail page loads", async () => {
    const { calls } = mockFetch({ "POST /api/v1/procurement/requests": [jsonResponse({ id: "req-9" }, 201)] });
    const { container } = render(<RequestComposer currency="USD" timeZone="America/New_York" />);
    fireEvent.change(screen.getByRole("textbox", { name: /Instruction/ }), { target: { value: "Restock fryer oil for the weekend" } });
    const form = container.querySelector("form")!;

    fireEvent.submit(form);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/procurement/req-9?research=1"));
    // router.push resolves before the next page renders; a second press must not create another request.
    expect(screen.getByRole("button", { name: /Create & research/ })).toBeDisabled();
    fireEvent.submit(form);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(calls[0]!.body).toMatchObject({ instruction: "Restock fryer oil for the weekend", currency: "USD", allow_alternatives: true });
  });

  it("explains an invalid budget instead of submitting", () => {
    const { fetchMock } = mockFetch({});
    const { container } = render(<RequestComposer currency="USD" />);
    fireEvent.change(screen.getByRole("textbox", { name: /Instruction/ }), { target: { value: "Restock containers" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Budget cap/ }), { target: { value: "12,50" } });
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getAllByText("Enter an amount like 300 or 299.99.").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
