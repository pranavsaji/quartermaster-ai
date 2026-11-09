"use client";

import {
  PRODUCT_CATEGORIES,
  SpendMandateInput,
  type ProductCategory,
  type SpendMandateDto,
  type SupplierDto,
} from "@qm/contracts";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Checkbox, Field, Input, MoneyInput, Select } from "@/components/ui/Field";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api, type MandateUpdateResponse } from "@/lib/api";
import { ApiRequestError } from "@/lib/http";
import { inputToMinor, minorToInput, money } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { CATEGORY_LABELS } from "@/lib/labels";
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

function fromMandate(m: SpendMandateDto): FormState {
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

/** A group of related settings; its description and group-level error are announced with it. */
function Section({
  title,
  description,
  error,
  children,
}: {
  title: string;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, description ? `${id}-desc` : null].filter(Boolean).join(" ");
  return (
    <fieldset
      aria-describedby={describedBy || undefined}
      className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-line py-6 first:border-t-0 first:pt-0 lg:grid-cols-[240px_1fr]"
    >
      <legend className="sr-only">{title}</legend>
      <div>
        <p aria-hidden className="text-[14px] font-semibold text-ink">
          {title}
        </p>
        {description ? (
          <p id={`${id}-desc`} className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4">
        {error ? (
          <p id={`${id}-error`} className="text-[12px] font-medium text-block">
            {error}
          </p>
        ) : null}
        {children}
      </div>
    </fieldset>
  );
}

export function MandateForm({
  mandate,
  suppliers,
  editable,
  onSaved,
}: {
  mandate: SpendMandateDto;
  suppliers: SupplierDto[];
  editable: boolean;
  onSaved: (result: MandateUpdateResponse) => void;
}) {
  const [form, setForm] = useState<FormState>(() => fromMandate(mandate));
  const [errors, setErrors] = useState<Errors>({});
  const cur = mandate.currency;

  const save = useAction(async (body: SpendMandateInput) => {
    const result = await api.mandates.update(body);
    setForm(fromMandate(result.mandate));
    onSaved(result);
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = <T,>(s: Set<T>, v: T, on: boolean) => {
    const next = new Set(s);
    if (on) next.add(v);
    else next.delete(v);
    return next;
  };

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = validateMandateForm(form, mandate);
    setErrors(result.errors ?? {});
    if (result.body) void save.run(result.body);
  }

  function reset() {
    setForm(fromMandate(mandate));
    setErrors({});
    save.reset();
  }

  const conflict = save.error instanceof ApiRequestError && save.error.status === 409;

  return (
    <Card aria-labelledby="mandate-form-title">
      <form onSubmit={submit} noValidate>
        <CardHeader
          id="mandate-form-title"
          title="Spend mandate"
          description={`Version ${mandate.version} · ${mandate.status === "ACTIVE" ? "active" : "superseded"}. TrustRail evaluates every cart against these rules deterministically.`}
          actions={!editable ? <Badge tone="neutral">Read-only · owner can edit</Badge> : null}
        />
        <CardBody>
          <fieldset disabled={!editable || save.pending} className="contents">
            <Section title="Budget" description={`Amounts in ${cur}. Converted to integer cents before they reach the API.`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Weekly budget" required error={errors.weekly_budget_minor}>
                  {(control) => (
                    <MoneyInput {...control} currency={cur} value={form.weekly} onChange={(e) => set("weekly", e.target.value)} />
                  )}
                </Field>
                <Field label="Per-order limit" required error={errors.per_order_limit_minor} hint="≤ weekly budget">
                  {(control) => (
                    <MoneyInput {...control} currency={cur} value={form.perOrder} onChange={(e) => set("perOrder", e.target.value)} />
                  )}
                </Field>
                <Field label="Auto-approval limit" required error={errors.auto_approval_limit_minor} hint="≤ per-order limit">
                  {(control) => (
                    <MoneyInput {...control} currency={cur} value={form.autoApproval} onChange={(e) => set("autoApproval", e.target.value)} />
                  )}
                </Field>
              </div>
              <div className="rounded-lg border border-line bg-canvas/60 px-3.5 py-3">
                <Checkbox
                  checked
                  disabled
                  readOnly
                  label="Human approval required for every payment"
                  description="Fixed on. Quartermaster never pays without the owner's signed approval, even under the auto-approval limit — that limit only marks carts as low-risk in review."
                />
              </div>
            </Section>

            <Section
              title="Approved suppliers"
              description="Carts from any other supplier are blocked."
              error={errors.approved_supplier_ids}
            >
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {suppliers.map((s) => (
                  <li key={s.id} className="rounded-lg border border-line px-3 py-2.5">
                    <Checkbox
                      checked={form.suppliers.has(s.id)}
                      onChange={(e) => set("suppliers", toggle(form.suppliers, s.id, e.target.checked))}
                      label={s.name}
                      description={
                        <span className="flex flex-wrap items-center gap-1.5 pt-1">
                          <SourceLabel source={s.data_source} />
                          {!s.active ? <Badge tone="neutral">Inactive</Badge> : null}
                          {!s.checkout_eligible ? <Badge tone="review">No PayPal checkout</Badge> : null}
                          <span>
                            {s.lead_time_days} d lead · tax {(s.tax_rate_bps / 100).toFixed(2)}%
                            {s.fee_terms.length > 0
                              ? ` · ${s.fee_terms.map((f) => `${f.label} ${money(f.amount_minor, cur)}`).join(", ")}`
                              : ""}
                          </span>
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
              {suppliers.length === 0 ? <p className="text-[13px] text-ink-3">No suppliers found.</p> : null}
            </Section>

            <Section
              title="Allowed categories"
              description="Line items outside these categories are blocked (e.g. gift cards slipped into a cart)."
              error={errors.allowed_categories}
            >
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {PRODUCT_CATEGORIES.map((c) => (
                  <li key={c}>
                    <Checkbox
                      checked={form.categories.has(c)}
                      onChange={(e) => set("categories", toggle(form.categories, c, e.target.checked))}
                      label={CATEGORY_LABELS[c]}
                    />
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Market price guard" description="Compares delivered unit cost with Channel3 reference prices.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Max premium over market (%)" required error={errors.max_market_price_premium_pct} hint="0–500">
                  {(control) => (
                    <Input
                      {...control}
                      inputMode="numeric"
                      value={form.premiumPct}
                      onChange={(e) => set("premiumPct", e.target.value)}
                      className="tnum"
                    />
                  )}
                </Field>
                <Field label="When exceeded">
                  {(control) => (
                    <Select {...control} value={form.marketAction} onChange={(e) => set("marketAction", e.target.value as "REVIEW" | "BLOCK")}>
                      <option value="REVIEW">Require review</option>
                      <option value="BLOCK">Block</option>
                    </Select>
                  )}
                </Field>
              </div>
            </Section>

            <Section title="Duplicates & quantities" description="Stops repeat orders and over-buying.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Duplicate window (hours)" required error={errors.duplicate_window_hours} hint="0–720">
                  {(control) => (
                    <Input
                      {...control}
                      inputMode="numeric"
                      value={form.dupHours}
                      onChange={(e) => set("dupHours", e.target.value)}
                      className="tnum"
                    />
                  )}
                </Field>
                <Field label="On duplicate">
                  {(control) => (
                    <Select {...control} value={form.dupAction} onChange={(e) => set("dupAction", e.target.value as "REVIEW" | "BLOCK")}>
                      <option value="REVIEW">Require review</option>
                      <option value="BLOCK">Block</option>
                    </Select>
                  )}
                </Field>
                <Field label="Max quantity × need" required error={errors.max_quantity_multiple_of_need} hint="1–10, e.g. 1.5">
                  {(control) => (
                    <Input
                      {...control}
                      inputMode="decimal"
                      value={form.qtyMultiple}
                      onChange={(e) => set("qtyMultiple", e.target.value)}
                      className="tnum"
                    />
                  )}
                </Field>
              </div>
              <Checkbox
                checked={form.subscriptions}
                onChange={(e) => set("subscriptions", e.target.checked)}
                label="Allow subscriptions / recurring charges"
                description="Off by default: a supplier can't sneak a recurring plan into a one-off restock."
              />
            </Section>

            <Section title="Intent certificates" description="How long a signed approval stays payable.">
              <Field label="Certificate lifetime (minutes)" required error={errors.certificate_ttl_minutes} hint="5–60" className="max-w-56">
                {(control) => (
                  <Input
                    {...control}
                    inputMode="numeric"
                    value={form.ttl}
                    onChange={(e) => set("ttl", e.target.value)}
                    className="tnum"
                  />
                )}
              </Field>
            </Section>
          </fieldset>

          {conflict ? (
            <ErrorNotice error={save.error} title="The mandate changed since you opened it" />
          ) : (
            <ErrorNotice error={save.error} title="Couldn't save the mandate" />
          )}
        </CardBody>
        {editable ? (
          <CardFooter className="justify-between">
            <p className="text-[12.5px] text-ink-3">
              Saving creates version {mandate.version + 1} and revokes active certificates signed under v{mandate.version}.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset} disabled={save.pending}>
                Reset
              </Button>
              <Button type="submit" variant="primary" loading={save.pending}>
                Save mandate
              </Button>
            </div>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
