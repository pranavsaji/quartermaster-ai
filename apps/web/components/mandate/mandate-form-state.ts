/**
 * The spend mandate form's state and validation, kept apart from the component so the rules
 * (blank is never 0, amounts in minor units, plain-language messages) are easy to read and test.
 */
import { PRODUCT_CATEGORIES, SpendMandateInput, type ProductCategory, type SpendMandateDto } from "@qm/contracts";
import { inputToMinor, minorToInput } from "@/lib/format";
import { checkNumber, type NumberRule } from "@/lib/numbers";

export interface FormState {
  weekly: string;
  perOrder: string;
  autoApproval: string;
  suppliers: Set<string>;
  categories: Set<ProductCategory>;
  premiumPct: string;
  marketAction: "REVIEW" | "BLOCK";
  dupHours: string;
  dupAction: "REVIEW" | "BLOCK";
  subscriptions: boolean;
  ttl: string;
  qtyMultiple: string;
}

export type Errors = Partial<Record<keyof SpendMandateInput, string>>;

const NUMBER_FIELDS = {
  max_market_price_premium_pct: { field: "premiumPct", rule: { min: 0, max: 500, integer: true } },
  duplicate_window_hours: { field: "dupHours", rule: { min: 0, max: 720, integer: true } },
  certificate_ttl_minutes: { field: "ttl", rule: { min: 5, max: 60, integer: true } },
  max_quantity_multiple_of_need: { field: "qtyMultiple", rule: { min: 1, max: 10 } },
} as const satisfies Partial<Record<keyof SpendMandateInput, { field: keyof FormState; rule: NumberRule }>>;

/** What to say when the schema rejects a field for a reason the checks above don't cover. */
const SCHEMA_MESSAGES: Errors = {
  weekly_budget_minor: "Enter an amount up to 1,000,000.",
  per_order_limit_minor: "Enter an amount up to 1,000,000.",
  auto_approval_limit_minor: "Enter an amount up to 1,000,000.",
  approved_supplier_ids: "Choose at most 200 suppliers.",
  allowed_categories: "Select at least one category.",
};

/**
 * Turns the form into an API body, or field-level errors in plain language.
 * Blank or non-numeric fields are errors, never silently 0.
 */
export function validateMandateForm(
  form: FormState,
  mandate: Pick<SpendMandateDto, "currency" | "version">,
): { body: SpendMandateInput; errors: null } | { body: null; errors: Errors } {
  const errors: Errors = {};
  const amount = (key: keyof SpendMandateInput, raw: string): number => {
    const minor = inputToMinor(raw, mandate.currency);
    if (minor === null) {
      errors[key] = raw.trim() === "" ? "This field is required." : `Enter an amount in ${mandate.currency} using digits only.`;
    }
    return minor ?? -1;
  };
  const numbers = {} as Record<keyof typeof NUMBER_FIELDS, number>;
  for (const key of Object.keys(NUMBER_FIELDS) as (keyof typeof NUMBER_FIELDS)[]) {
    const { field, rule } = NUMBER_FIELDS[key];
    const checked = checkNumber(form[field], rule);
    if (checked.ok) numbers[key] = checked.value;
    else {
      errors[key] = checked.error;
      numbers[key] = -1;
    }
  }

  const parsed = SpendMandateInput.safeParse({
    currency: mandate.currency,
    weekly_budget_minor: amount("weekly_budget_minor", form.weekly),
    per_order_limit_minor: amount("per_order_limit_minor", form.perOrder),
    auto_approval_limit_minor: amount("auto_approval_limit_minor", form.autoApproval),
    human_approval_required: true,
    approved_supplier_ids: [...form.suppliers],
    allowed_categories: PRODUCT_CATEGORIES.filter((c) => form.categories.has(c)),
    market_price_action: form.marketAction,
    duplicate_action: form.dupAction,
    subscriptions_allowed: form.subscriptions,
    expected_version: mandate.version,
    ...numbers,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof SpendMandateInput | undefined;
      if (!key || key in errors) continue;
      // Our own cross-field refinements carry readable messages; built-in zod messages don't.
      errors[key] = issue.code === "custom" ? `${issue.message}.` : (SCHEMA_MESSAGES[key] ?? "Check this value.");
    }
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { body: null, errors };
  return { body: parsed.data, errors: null };
}

export function fromMandate(m: SpendMandateDto): FormState {
  return {
    weekly: minorToInput(m.weekly_budget_minor, m.currency),
    perOrder: minorToInput(m.per_order_limit_minor, m.currency),
    autoApproval: minorToInput(m.auto_approval_limit_minor, m.currency),
    suppliers: new Set(m.approved_supplier_ids),
    categories: new Set(m.allowed_categories),
    premiumPct: String(m.max_market_price_premium_pct),
    marketAction: m.market_price_action,
    dupHours: String(m.duplicate_window_hours),
    dupAction: m.duplicate_action,
    subscriptions: m.subscriptions_allowed,
    ttl: String(m.certificate_ttl_minutes),
    qtyMultiple: String(m.max_quantity_multiple_of_need),
  };
}
