import { describe, expect, it } from "vitest";
import { csvSafe } from "@/components/grid/DataGrid";

describe("csvSafe", () => {
  it("neutralises cells a spreadsheet would run as formulas", () => {
    expect(csvSafe('=HYPERLINK("https://evil.example","Click")')).toBe(`'=HYPERLINK("https://evil.example","Click")`);
    expect(csvSafe("+1+cmd|' /C calc'!A0")).toBe("'+1+cmd|' /C calc'!A0");
    expect(csvSafe("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvSafe("-2+3")).toBe("'-2+3");
    expect(csvSafe("\t=1")).toBe("'\t=1");
  });

  it("leaves ordinary text, numbers and money alone", () => {
    expect(csvSafe("Harbor Restaurant Supply")).toBe("Harbor Restaurant Supply");
    expect(csvSafe("-$5.00")).toBe("-$5.00");
    expect(csvSafe("-12")).toBe("-12");
    expect(csvSafe(42)).toBe("42");
    expect(csvSafe(null)).toBe("");
  });
});
