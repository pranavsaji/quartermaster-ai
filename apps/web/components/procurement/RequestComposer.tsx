"use client";

import { CreateProcurementRequest } from "@qm/contracts";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DemandSlider } from "@/components/inventory/DemandSlider";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Checkbox, Field, Input, MoneyInput, Textarea } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { api } from "@/lib/api";
import { inputToMinor, todayIso } from "@/lib/format";
import { useAction } from "@/lib/hooks";

/** An example, shown as a placeholder: the owner's request starts empty rather than pre-written. */
const EXAMPLE_INSTRUCTION = "e.g. We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.";

export function RequestComposer({
  currency,
  timeZone,
  onCancel,
}: {
  currency: string;
  /** The organisation's IANA zone: "today" is the restaurant's today. */
  timeZone?: string;
  onCancel?: () => void;
}) {
  const today = todayIso(timeZone);
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [budget, setBudget] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [overrideDemand, setOverrideDemand] = useState(false);
  const [multiplier, setMultiplier] = useState(1.25);
  const [allowAlternatives, setAllowAlternatives] = useState(true);
  const [errors, setErrors] = useState<{ instruction?: string; budget?: string; requiredBy?: string }>({});
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();

  const create = useAction(async (body: CreateProcurementRequest) => {
    const created = await api.procurement.create(body);
    router.push(`/procurement/${created.id}?research=1`);
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: typeof errors = {};
    const budgetMinor = budget.trim() === "" ? undefined : inputToMinor(budget, currency);
    if (budgetMinor === null) next.budget = "Enter an amount like 300 or 299.99.";
    if (requiredBy && requiredBy < today) next.requiredBy = "Pick today or a future date.";

    const parsed = CreateProcurementRequest.safeParse({
      instruction: instruction.trim(),
      currency,
      budget_limit_minor: budgetMinor ?? undefined,
      required_by: requiredBy || undefined,
      allow_alternatives: allowAlternatives,
      demand_multiplier: overrideDemand ? multiplier : undefined,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "instruction") next.instruction = "Describe what you need (3–2000 characters).";
        if (key === "budget_limit_minor") next.budget = "Budget must be a positive amount.";
        if (key === "required_by") next.requiredBy = "Use a valid date.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !parsed.success) {
      focusFirstError();
      return;
    }
    void create.run(parsed.data);
  }

  return (
    <Card aria-labelledby="composer-title">
      <form ref={containerRef} onSubmit={submit} noValidate>
        <CardHeader
          id="composer-title"
          title="New procurement request"
          description="Tell Quartermaster what you need in plain language. It will forecast, research the market, compare sandbox suppliers and propose carts for your approval — it never pays on its own."
        />
        <CardBody className="space-y-5">
          <Field label="Instruction" required error={errors.instruction} hint="Mention items, timing and any spending cap.">
            {(control) => (
              <Textarea
                {...control}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={EXAMPLE_INSTRUCTION}
                maxLength={2000}
                rows={3}
                className="text-[14px] leading-relaxed"
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Budget cap (optional)" error={errors.budget} hint="TrustRail blocks any cart above this.">
              {(control) => (
                <MoneyInput
                  {...control}
                  currency={currency}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="300.00"
                />
              )}
            </Field>
            <Field label="Required by (optional)" error={errors.requiredBy}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  min={today}
                  value={requiredBy}
                  onChange={(e) => setRequiredBy(e.target.value)}
                  className="tnum"
                />
              )}
            </Field>
          </div>

          <div className="rounded-lg border border-line p-3.5">
            <Checkbox
              label="Set the demand assumption explicitly"
              description="Otherwise Quartermaster infers it from your instruction (e.g. “busy weekend”)."
              checked={overrideDemand}
              onChange={(e) => setOverrideDemand(e.target.checked)}
            />
            {overrideDemand ? (
              <div className="mt-4">
                <DemandSlider value={multiplier} onChange={setMultiplier} />
              </div>
            ) : null}
          </div>

          <Checkbox
            label="Allow comparable alternatives"
            description="Let the agent propose equivalent products from other approved sandbox suppliers."
            checked={allowAlternatives}
            onChange={(e) => setAllowAlternatives(e.target.checked)}
          />

          <ErrorSummary key={attempt} messages={[errors.instruction, errors.budget, errors.requiredBy]} />
          <ErrorNotice error={create.error} />
        </CardBody>
        <CardFooter className="justify-end">
          {onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" variant="primary" loading={create.pending}>
            Create &amp; research
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
