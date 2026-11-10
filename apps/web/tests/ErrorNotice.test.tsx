import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { ApiRequestError } from "@/lib/http";

const err = (status: number, code: string, message: string) => new ApiRequestError({ status, code, message, correlationId: "corr-123" });

describe("ErrorNotice", () => {
  it("explains a role denial and points to the owner", () => {
    render(<ErrorNotice error={err(403, "ROLE_REQUIRED", "This action requires the OWNER role.")} onRetry={vi.fn()} />);
    expect(screen.getByText("You don't have permission")).toBeInTheDocument();
    expect(screen.getByText(/This action requires the OWNER role\. Ask the restaurant owner/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it.each([
    ["CSRF_HEADER_MISSING", "Missing X-Requested-With header."],
    ["FORBIDDEN", "Only the owner who approved this purchase can pay for it."],
    ["FORBIDDEN", "Synthetic delivery actions are disabled."],
  ])("shows the server's reason for a non-role 403 (%s)", (code, message) => {
    render(<ErrorNotice error={err(403, code, message)} />);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText("You don't have permission")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ask the restaurant owner/)).not.toBeInTheDocument();
    // Codes and correlation ids are only for server failures (5xx), not for a refusal that explains itself.
    expect(screen.queryByText(code)).not.toBeInTheDocument();
  });

  it("shows other API errors with their code, correlation id and a retry", () => {
    const onRetry = vi.fn();
    render(
      <ErrorNotice error={err(502, "UPSTREAM_ERROR", "The Quartermaster API is unreachable.")} onRetry={onRetry} title="Couldn't load" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load");
    expect(screen.getByText("corr-123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders nothing without an error", () => {
    const { container } = render(<ErrorNotice error={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
