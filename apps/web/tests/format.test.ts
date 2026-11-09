import { describe, expect, it } from "vitest";
import { addDaysIso, daysBetweenIso, inputToMinor, minorToInput, relativeDay, relativeTime, todayIso } from "@/lib/format";

describe("inputToMinor", () => {
  it("converts typed amounts to integer minor units", () => {
    expect(inputToMinor("300")).toBe(30000);
    expect(inputToMinor("299.99")).toBe(29999);
    expect(inputToMinor("12.5")).toBe(1250);
    expect(inputToMinor(" $1,234.50 ")).toBe(123450);
    expect(inputToMinor("0")).toBe(0);
  });

  it("rejects blank, negative, non-numeric and over-precise input", () => {
    expect(inputToMinor("")).toBeNull();
    expect(inputToMinor("   ")).toBeNull();
    expect(inputToMinor("-5")).toBeNull();
    expect(inputToMinor("abc")).toBeNull();
    expect(inputToMinor("1.234")).toBeNull();
    expect(inputToMinor("1e3")).toBeNull();
  });

  it("accepts commas only as thousands separators", () => {
    expect(inputToMinor("1,234")).toBe(123400);
    expect(inputToMinor("1,234,567.89")).toBe(123456789);
    expect(inputToMinor("$ 12,000")).toBe(1200000);
    // A decimal comma or misplaced separator is not silently read as a bigger number.
    expect(inputToMinor("12,50")).toBeNull();
    expect(inputToMinor("1,23")).toBeNull();
    expect(inputToMinor("1234,567")).toBeNull();
    expect(inputToMinor(",123")).toBeNull();
    expect(inputToMinor("1,234,")).toBeNull();
    expect(inputToMinor("1.234,5")).toBeNull();
    expect(inputToMinor("1 234")).toBeNull();
  });

  it("respects the currency exponent", () => {
    expect(inputToMinor("500", "JPY")).toBe(500);
    expect(inputToMinor("500.5", "JPY")).toBeNull();
  });

  it("round-trips with minorToInput", () => {
    expect(minorToInput(12345)).toBe("123.45");
    expect(inputToMinor(minorToInput(98765))).toBe(98765);
  });
});

describe("todayIso", () => {
  // 2026-11-09 23:30 in New York is already 2026-11-10 in UTC and Tokyo.
  const instant = Date.parse("2026-11-10T04:30:00Z");

  it("uses the organisation's time zone, not the browser's", () => {
    expect(todayIso("America/New_York", instant)).toBe("2026-11-09");
    expect(todayIso("UTC", instant)).toBe("2026-11-10");
    expect(todayIso("Asia/Tokyo", instant)).toBe("2026-11-10");
  });

  it("falls back to the browser zone for an unknown zone", () => {
    expect(todayIso("Not/AZone", instant)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("calendar-day helpers", () => {
  it("moves and compares calendar dates across month, year and DST boundaries", () => {
    expect(addDaysIso("2026-11-12", 1)).toBe("2026-11-13");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-08", 1)).toBe("2026-03-09");
    expect(daysBetweenIso("2026-11-09", "2026-11-12")).toBe(3);
    expect(daysBetweenIso("2026-11-09", "2026-11-01")).toBe(-8);
  });

  it("describes a date-only value in whole days from the organisation's today", () => {
    // 23:30 on Nov 9 in New York is already Nov 10 in UTC.
    const now = Date.parse("2026-11-10T04:30:00Z");
    expect(relativeDay("2026-11-09", "America/New_York", now)).toBe("today");
    expect(relativeDay("2026-11-10", "America/New_York", now)).toBe("tomorrow");
    expect(relativeDay("2026-11-12", "America/New_York", now)).toBe("in 3 days");
    expect(relativeDay("2026-11-07", "America/New_York", now)).toBe("2 days ago");
    expect(relativeDay("2026-11-10", "UTC", now)).toBe("today");
    expect(relativeDay(null)).toBe("—");
  });

  it("never gives hours for a calendar date", () => {
    const now = new Date(2026, 10, 9, 15, 0).getTime();
    expect(relativeTime("2026-11-09", now)).toBe("today");
    expect(relativeTime("2026-11-08", now)).toBe("yesterday");
    expect(relativeTime("2026-11-09T12:00:00", now)).toBe("3 hours ago");
  });
});
