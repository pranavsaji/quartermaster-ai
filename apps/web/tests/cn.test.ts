import { describe, expect, it } from "vitest";
import { cn } from "@/components/ui/cn";

describe("cn", () => {
  it("skips falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("lets a later class override a conflicting earlier one", () => {
    expect(cn("min-h-24 py-2", "min-h-14")).toBe("py-2 min-h-14");
    expect(cn("skeleton rounded-md", "h-11 w-full rounded-full")).toBe("skeleton h-11 w-full rounded-full");
    expect(cn("h-8 px-3 rounded-md", "h-11")).toBe("px-3 rounded-md h-11");
    expect(cn("bg-surface", "bg-canvas/50")).toBe("bg-canvas/50");
  });

  it("treats the app's colour tokens as colours, not font sizes", () => {
    expect(cn("text-sm text-ink", "text-[13px]")).toBe("text-ink text-[13px]");
    expect(cn("border-line-strong", "border-review")).toBe("border-review");
    expect(cn("bg-surface text-ink-2", "text-block")).toBe("bg-surface text-block");
  });

  it("keeps a side padding that refines a shorthand", () => {
    expect(cn("px-3", "pl-6")).toBe("px-3 pl-6");
  });

  it("keeps the app's custom utilities", () => {
    expect(cn("tnum h-9", "font-mono")).toBe("tnum h-9 font-mono");
    expect(cn("skeleton h-4", "h-9")).toBe("skeleton h-9");
  });
});
