import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, Notifier, notificationEmail, renderEmail } from "@qm/integrations";

describe("email template", () => {
  const base = {
    preheader: "Harbor expects to deliver Thu",
    status: "Payment completed",
    tone: "success" as const,
    title: "Payment completed for PO-1",
    paragraphs: ["PayPal captured the payment."],
    details: [
      { label: "Supplier", value: "Harbor <script>alert(1)</script>" },
      { label: "Amount paid", value: "$173.20" },
    ],
    action: { label: "View the order", href: "https://app.example/orders?a=1&b=2" },
    footnote: "Informational only.",
  };

  it("escapes every interpolated value (supplier names are outside input)", () => {
    const { html } = renderEmail(base);
    expect(html).not.toContain("<script>");
    expect(html).toContain("Harbor &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain('href="https://app.example/orders?a=1&amp;b=2"');
  });

  it("is a table layout with inline styles and a plain-text twin", () => {
    const { html, text } = renderEmail(base);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toMatch(/<style|class=/);
    expect(html).toContain('role="presentation"');
    expect(text).toContain("Payment completed for PO-1");
    expect(text).toContain("Amount paid: $173.20");
    expect(text).toContain("View the order: https://app.example/orders?a=1&b=2");
    expect(text).not.toMatch(/<(table|td|tr|a |div|p)[ >]/);
  });

  it("colours the status band by tone", () => {
    expect(renderEmail({ ...base, tone: "blocked" }).html).toContain("#fef3f2");
    expect(renderEmail(base).html).toContain("#ecfdf3");
  });

  it("formats money from minor units and calendar dates without shifting them", () => {
    expect(formatMoney(17320, "USD")).toBe("$173.20");
    expect(formatMoney(1200, "JPY")).toBe("¥1,200");
    expect(formatDate("2026-11-12")).toBe("Thu, Nov 12, 2026");
    expect(formatDate("not a date")).toBe("not a date");
  });
});

describe("notifier email payload", () => {
  it("ships a finished subject, HTML body and text body for the Zap", () => {
    const n = new Notifier({ webhookUrl: "https://hooks.example/x", appBaseUrl: "https://app.example" });
    const p = n.payload({
      kind: "PAYMENT_COMPLETED",
      organization_id: "org",
      title: "Payment completed for PO-1",
      summary: "Captured.",
      link_path: "/orders",
      details: [{ label: "Order", value: "PO-1" }],
    });
    expect(p.link).toBe("https://app.example/orders");
    expect(p.email_subject).toBe("Payment completed for PO-1");
    expect(String(p.email_html)).toContain("Payment completed");
    expect(String(p.email_html)).toContain('href="https://app.example/orders"');
    expect(String(p.email_text)).toContain("Order: PO-1");
    // the original fields stay, so an existing Zap keeps working
    expect(p.title).toBe("Payment completed for PO-1");
    expect(p.summary).toBe("Captured.");
  });

  it("gives every notification kind a status and an action", () => {
    for (const kind of ["APPROVAL_REQUIRED", "PURCHASE_BLOCKED", "PAYMENT_COMPLETED", "INVOICE_FLAGGED", "DELIVERY_DELAYED"] as const) {
      const e = notificationEmail({ kind, organization_id: "o", title: "T", summary: "S" }, "https://app.example/");
      expect(e.html).toMatch(/<td style="border-radius:8px;background:#2453d8">/);
      expect(e.text.length).toBeGreaterThan(10);
    }
  });
});
