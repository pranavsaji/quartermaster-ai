import type { AgentStepDto, MarketReferenceDto } from "@qm/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentTimeline } from "@/components/procurement/AgentTimeline";
import { MarketEvidence } from "@/components/procurement/MarketEvidence";
import { StatusBadge } from "@/components/ui/Badge";
import { lookup, PO_STATUS_TONES } from "@/lib/labels";

describe("lookup", () => {
  it("returns the mapped value or the fallback, never an inherited property", () => {
    const map = { A: 1, B: 2 } as const;
    expect(lookup(map, "A", 0)).toBe(1);
    expect(lookup(map, "NEW_VALUE", 0)).toBe(0);
    expect(lookup(map, "toString", 0)).toBe(0);
  });
});

describe("unknown enum values from a newer API", () => {
  it("render with a neutral fallback instead of crashing", () => {
    const ref = {
      inventory_item_id: "i-1",
      status: "RATE_LIMITED",
      reference_unit_price_minor: null,
      sample_size: 0,
      observed_at: null,
      quotes: [],
    } as unknown as MarketReferenceDto;
    const step = {
      id: "s-1",
      tool: "plan_carts",
      status: "RETRYING",
      summary: "Retrying with a smaller cart",
      started_at: "2026-11-09T10:00:00.000Z",
      duration_ms: 1200,
    } as unknown as AgentStepDto;

    render(
      <>
        <MarketEvidence market={[ref]} itemNames={new Map([["i-1", "Fryer oil"]])} currency="USD" />
        <AgentTimeline steps={[step]} />
        <StatusBadge status={"ON_HOLD" as never} tones={PO_STATUS_TONES} kind="Order" />
      </>,
    );
    expect(screen.getByText("Rate limited")).toBeInTheDocument();
    expect(screen.getByText("Retrying")).toBeInTheDocument();
    expect(screen.getByText("On hold")).toBeInTheDocument();
  });
});
