import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyValue } from "@/components/ui/CopyValue";

const HASH = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef";

describe("CopyValue", () => {
  it("copies with the Clipboard API", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<CopyValue value={HASH} label="cart hash" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy cart hash" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "cart hash copied" })).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(HASH);
  });

  it("selects the full value when the clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: () => Promise.reject(new Error("denied")) } });
    render(<CopyValue value={HASH} label="cart hash" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy cart hash" }));
    await waitFor(() => expect(window.getSelection()?.toString()).toBe(HASH));
    expect(screen.getByText(/press Ctrl\+C or Cmd\+C/)).toBeInTheDocument();
  });
});
