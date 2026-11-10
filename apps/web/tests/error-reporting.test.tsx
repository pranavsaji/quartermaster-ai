import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorListeners } from "@/components/monitoring/ErrorListeners";
import { buildReport, createErrorReporter, MAX_REPORTS_PER_PAGE } from "@/lib/error-reporting";
import { jsonResponse, mockFetch } from "./helpers";

describe("buildReport", () => {
  it("sends only the path, and trims message and stack to what the API accepts", () => {
    window.history.replaceState(null, "", "/invite?x=1#token=secret-token-value-123456");
    const error = Object.assign(new Error("x".repeat(900)), { digest: "d1" });
    const report = buildReport(error, "render");
    expect(report.path).toBe("/invite");
    expect(report.message).toHaveLength(500);
    expect(report.digest).toBe("d1");
    expect(report.stack!.length).toBeLessThanOrEqual(4000);
    expect(JSON.stringify(report)).not.toContain("secret-token");
    window.history.replaceState(null, "", "/");
  });

  it("describes non-Error values", () => {
    expect(buildReport("boom", "rejection", { path: "/a" })).toEqual({ kind: "rejection", message: "boom", path: "/a" });
    expect(buildReport({ weird: true }, "unhandled", { path: "/a" }).message).toBe("Non-error value thrown");
  });
});

describe("createErrorReporter", () => {
  it("caps reports per page and drops repeats of the same error", () => {
    const send = vi.fn(async () => undefined);
    const reporter = createErrorReporter(send);
    reporter.report(new Error("same"), "render");
    reporter.report(new Error("same"), "render");
    for (let i = 0; i < 10; i++) reporter.report(new Error(`e${i}`), "unhandled");
    expect(send).toHaveBeenCalledTimes(MAX_REPORTS_PER_PAGE);
    expect(reporter.sent).toBe(MAX_REPORTS_PER_PAGE);
  });

  it("never throws, even when sending fails", async () => {
    const reporter = createErrorReporter(() => Promise.reject(new Error("offline")));
    expect(() => reporter.report(new Error("x"), "render")).not.toThrow();
    const throwing = createErrorReporter(() => {
      throw new Error("sync failure");
    });
    expect(() => throwing.report(new Error("y"), "render")).not.toThrow();
  });

  it("posts to the API with the CSRF header by default", async () => {
    const { calls } = mockFetch({ "POST /api/v1/client-errors": [jsonResponse({}, 202)] });
    createErrorReporter().report(new Error("kaput"), "render", { digest: "abc" });
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.headers["x-requested-with"]).toBe("quartermaster");
    expect(calls[0]!.body).toMatchObject({ kind: "render", message: "kaput", digest: "abc" });
  });
});

describe("ErrorListeners", () => {
  it("reports uncaught errors and unhandled rejections, and stops listening when unmounted", () => {
    const report = vi.fn();
    const { unmount } = render(<ErrorListeners reporter={{ report, sent: 0 }} />);
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("handler blew up"), message: "handler blew up" }));
    const rejection = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(rejection, "reason", { value: "nope" });
    window.dispatchEvent(rejection);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: "handler blew up" }), "unhandled");
    expect(report).toHaveBeenCalledWith("nope", "rejection");
    unmount();
    window.dispatchEvent(rejection);
    expect(report).toHaveBeenCalledTimes(2);
  });
});
