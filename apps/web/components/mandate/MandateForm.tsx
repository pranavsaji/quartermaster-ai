"use client";

import {
  PRODUCT_CATEGORIES,
  SpendMandateInput,
  type ProductCategory,
  type SpendMandateDto,
  type SupplierDto,
} from "@qm/contracts";
import { useState, type FormEvent, type ReactNode } from "react";
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

interface FormState {
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

type Errors = Partial<Record<keyof SpendMandateInput | "form", string>>;

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

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-line py-6 first:border-t-0 first:pt-0 lg:grid-cols-[240px_1fr]">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden>
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        {description ? <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
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
    const next: Errors = {};
    const weekly = inputToMinor(form.weekly, cur);
    const perOrder = inputToMinor(form.perOrder, cur);
    const autoApproval = inputToMinor(form.autoApproval, cur);
    if (weekly === null) next.weekly_budget_minor = "Enter a dollar amount.";
    if (perOrder === null) next.per_order_limit_minor = "Enter a dollar amount.";
    if (autoApproval === null) next.auto_approval_limit_minor = "Enter a dollar amount.";

    const parsed = SpendMandateInput.safeParse({
      currency: cur,
      weekly_budget_minor: weekly ?? -1,
      per_order_limit_minor: perOrder ?? -1,
      auto_approval_limit_minor: autoApproval ?? -1,
      human_approval_required: true,
      approved_supplier_ids: [...form.suppliers],
      allowed_categories: PRODUCT_CATEGORIES.filter((c) => form.categories.has(c)),
      max_market_price_premium_pct: Number(form.premiumPct),
      market_price_action: form.marketAction,
      duplicate_window_hours: Number(form.dupHours),
      duplicate_action: form.dupAction,
      subscriptions_allowed: form.subscriptions,
      certificate_ttl_minutes: Number(form.ttl),
      max_quantity_multiple_of_need: Number(form.qtyMultiple),
      expected_version: mandate.version,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in next)) next[key as keyof SpendMandateInput] = issue.message;
      }
    }
    setErrors(next);
    if (!parsed.success || Object.keys(next).length > 0) return;
    void save.run(parsed.data);
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
                    <MoneyInput {...control} value={form.weekly} onChange={(e) => set("weekly", e.target.value)} />
                  )}
                </Field>
                <Field label="Per-order limit" required error={errors.per_order_limit_minor} hint="≤ weekly budget">
                  {(control) => (
                    <MoneyInput {...control} value={form.perOrder} onChange={(e) => set("perOrder", e.target.value)} />
                  )}
                </Field>
                <Field label="Auto-approval limit" required error={errors.auto_approval_limit_minor} hint="≤ per-order limit">
                  {(control) => (
                    <MoneyInput {...control} value={form.autoApproval} onChange={(e) => set("autoApproval", e.target.value)} />
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

            <Section title="Approved suppliers" description="Carts from any other supplier are blocked.">
              {errors.approved_supplier_ids ? <p className="text-[12px] font-medium text-block">{errors.approved_supplier_ids}</p> : null}
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

            <Section title="Allowed categories" description="Line items outside these categories are blocked (e.g. gift cards slipped into a cart).">
              {errors.allowed_categories ? (
                <p className="text-[12px] font-medium text-block">Select at least one category.</p>
              ) : null}
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
                <Field label="Max premium over market (%)" error={errors.max_market_price_premium_pct} hint="0–500">
                  {(control) => (
                    <Input {...control} type="number" min={0} max={500} step={1} value={form.premiumPct} onChange={(e) => set("premiumPct", e.target.value)} className="tnum" />
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
                <Field label="Duplicate window (hours)" error={errors.duplicate_window_hours} hint="0–720">
                  {(control) => (
                    <Input {...control} type="number" min={0} max={720} step={1} value={form.dupHours} onChange={(e) => set("dupHours", e.target.value)} className="tnum" />
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
                <Field label="Max quantity × need" error={errors.max_quantity_multiple_of_need} hint="1–10, e.g. 1.5">
                  {(control) => (
                    <Input {...control} type="number" min={1} max={10} step={0.1} value={form.qtyMultiple} onChange={(e) => set("qtyMultiple", e.target.value)} className="tnum" />
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
              <Field label="Certificate lifetime (minutes)" error={errors.certificate_ttl_minutes} hint="5–60" className="max-w-56">
                {(control) => (
                  <Input {...control} type="number" min={5} max={60} step={1} value={form.ttl} onChange={(e) => set("ttl", e.target.value)} className="tnum" />
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
              <Button variant="ghost" onClick={() => { setForm(fromMandate(mandate)); setErrors({}); save.reset(); }} disabled={save.pending}>
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
