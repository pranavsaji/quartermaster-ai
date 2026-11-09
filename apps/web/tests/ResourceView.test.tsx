import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResourceView } from "@/components/ui/ResourceView";

const resource = (error: unknown = undefined) => ({ error, updatedAt: Date.parse("2026-11-09T10:00:00Z"), reload: vi.fn() });

describe("ResourceView", () => {
  it("shows the error with a retry when nothing has loaded", () => {
    const r = resource(new Error("API down"));
    render(
      <ResourceView resource={r} hasData={false} loading={<p>Loading…</p>}>
        <p>rows</p>
      </ResourceView>,
    );
    expect(screen.getByText("API down")).toBeInTheDocument();
    expect(screen.queryByText("rows")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(r.reload).toHaveBeenCalled();
  });

  it("shows the loading placeholder until data arrives", () => {
    render(
      <ResourceView resource={resource()} hasData={false} loading={<p>Loading…</p>}>
        <p>rows</p>
      </ResourceView>,
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("rows")).not.toBeInTheDocument();
  });

  it("lets children render their own loading state when no placeholder is given", () => {
    render(
      <ResourceView resource={resource()} hasData={false}>
        <p>grid with its own overlay</p>
      </ResourceView>,
    );
    expect(screen.getByText("grid with its own overlay")).toBeInTheDocument();
  });

  it("keeps the data and flags a failed refresh above it", () => {
    render(
      <ResourceView resource={resource(new Error("timeout"))} hasData>
        <p>rows</p>
      </ResourceView>,
    );
    expect(screen.getByText("rows")).toBeInTheDocument();
    expect(screen.getByText(/Couldn't refresh — showing data from/)).toBeInTheDocument();
  });
});
