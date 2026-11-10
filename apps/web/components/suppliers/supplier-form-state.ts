/**
 * Supplier form state ↔ `SupplierInput`. The form holds what people type (dollars, percentages,
 * day counts as text); the API takes integer minor units and basis points. Fee codes are internal
 * identifiers: they are derived from the label for new fees and kept as they are for existing ones.
 */
import { SupplierInput, type FeeTermDto, type SupplierDto } from "@qm/contracts";
import { inputToMinor, minorToInput } from "@/lib/format";
import { checkNumber } from "@/lib/numbers";

export interface FeeRow {
  /** Stable React key. */
  key: string;
  /** Kept from the server for existing fees; derived from the label when blank. */
  code: string;
  label: string;
  kind: "SHIPPING" | "FEE";
  amount: string;
  /** Subtotal at which the fee is waived; blank = never. */
  waivedOver: string;
}

export interface SupplierFormState {
  name: string;
  website: string;
  description: string;
  leadTimeDays: string;
  taxPercent: string;
  active: boolean;
  checkoutEligible: boolean;
  fees: FeeRow[];
}

export type SupplierFormErrors = Partial<Record<string, string>>;

let keySeq = 0;
export const newFeeKey = () => `fee-${++keySeq}`;

export function emptyFee(kind: FeeRow["kind"] = "SHIPPING"): FeeRow {
  return { key: newFeeKey(), code: "", label: kind === "SHIPPING" ? "Delivery" : "", kind, amount: "", waivedOver: "" };
}

export function emptySupplierForm(): SupplierFormState {
  return {
    name: "",
    website: "",
    description: "",
    leadTimeDays: "2",
    taxPercent: "0",
    active: true,
    checkoutEligible: true,
    fees: [emptyFee("SHIPPING")],
  };
}

/** Basis points → a percentage for the form (825 → "8.25", 800 → "8"). */
export function bpsToPercent(bps: number): string {
  return String(bps / 100);
}

/** A percentage typed by a person → basis points, or null ("8.25" → 825; at most two decimals). */
export function percentToBps(value: string): number | null {
  const trimmed = value.trim().replace(/%$/, "").trim();
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export function supplierToForm(
  s: Pick<
    SupplierDto,
    "name" | "website" | "description" | "lead_time_days" | "tax_rate_bps" | "active" | "checkout_eligible" | "fee_terms"
  >,
  currency: string,
): SupplierFormState {
  return {
    name: s.name,
    website: s.website ?? "",
    description: s.description ?? "",
    leadTimeDays: String(s.lead_time_days),
    taxPercent: bpsToPercent(s.tax_rate_bps),
    active: s.active,
    checkoutEligible: s.checkout_eligible,
    fees: s.fee_terms.map((f: FeeTermDto) => ({
      key: newFeeKey(),
      code: f.code,
      label: f.label,
      kind: f.kind,
      amount: minorToInput(f.amount_minor, currency),
      waivedOver: f.waived_over_minor === null ? "" : minorToInput(f.waived_over_minor, currency),
    })),
  };
}

/** `"Cold-chain delivery"` → `"COLD_CHAIN_DELIVERY"`, made unique against `taken`. */
export function feeCode(label: string, kind: FeeRow["kind"], taken: Set<string>): string {
  const base =
    label
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28) || (kind === "SHIPPING" ? "SHIPPING" : "FEE");
  let code = base;
  for (let n = 2; taken.has(code); n++) code = `${base}_${n}`;
  return code;
}

export type SupplierFormResult = { ok: true; value: SupplierInput } | { ok: false; errors: SupplierFormErrors };

/** Validates the form; on success returns the request body exactly as the API expects it. */
export function formToSupplierInput(form: SupplierFormState, currency: string): SupplierFormResult {
  const errors: SupplierFormErrors = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = "Enter the supplier's name (at least 2 characters).";
  const website = form.website.trim();
  if (website && !/^https?:\/\/\S+\.\S+/i.test(website)) errors.website = "Enter a full web address starting with https://.";
  const lead = checkNumber(form.leadTimeDays, { integer: true, min: 0, max: 60 });
  if (!lead.ok) errors.leadTimeDays = lead.error;
  const bps = percentToBps(form.taxPercent);
  if (bps === null || bps > 3000) errors.taxPercent = "Enter a tax rate from 0 to 30%, with at most two decimals.";

  const taken = new Set(form.fees.map((f) => f.code).filter(Boolean));
  const fees = form.fees.map((f, i) => {
    const label = f.label.trim();
    if (!label) errors[`fees.${i}.label`] = `Fee ${i + 1}: enter a label.`;
    const amount = inputToMinor(f.amount, currency);
    if (amount === null) errors[`fees.${i}.amount`] = `Fee ${i + 1}: enter an amount like 8.99.`;
    const waived = f.waivedOver.trim() === "" ? null : inputToMinor(f.waivedOver, currency);
    if (f.waivedOver.trim() !== "" && waived === null)
      errors[`fees.${i}.waivedOver`] = `Fee ${i + 1}: enter an amount like 150, or leave it blank.`;
    let code = f.code;
    if (!code) {
      code = feeCode(label, f.kind, taken);
      taken.add(code);
    }
    return { code, label, kind: f.kind, amount_minor: amount ?? 0, waived_over_minor: waived };
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const parsed = SupplierInput.safeParse({
    name,
    website: website || null,
    description: form.description.trim() || null,
    lead_time_days: lead.ok ? lead.value : 0,
    tax_rate_bps: bps ?? 0,
    fee_terms: fees,
    active: form.active,
    checkout_eligible: form.checkoutEligible,
  });
  if (!parsed.success) {
    const out: SupplierFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      out[key === "lead_time_days" ? "leadTimeDays" : key === "tax_rate_bps" ? "taxPercent" : key] ??= issue.message;
    }
    return { ok: false, errors: out };
  }
  return { ok: true, value: parsed.data };
}
