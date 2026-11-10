"use client";

import { SignupRequest } from "@qm/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AuthFootnote } from "@/components/auth/AuthLayout";
import { checkNewPassword, PASSWORD_HINT } from "@/components/auth/password";
import { usePublicConfig } from "@/components/auth/usePublicConfig";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";

type FieldName = "name" | "email" | "password" | "confirm" | "organization_name" | "timezone";
type Errors = Partial<Record<FieldName, string>>;

const MESSAGES: Record<Exclude<FieldName, "password" | "confirm">, string> = {
  name: "Enter your name.",
  email: "Enter a valid email address.",
  organization_name: "Enter your restaurant's name (at least 2 characters).",
  timezone: "Choose a time zone.",
};

/** The browser's time zone, used as the default (budgets reset on the restaurant's local week). */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  } catch {
    return "America/Los_Angeles";
  }
}

function timeZones(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = [];
  }
  return zones.includes(current) ? zones : [current, ...zones];
}

export function SignupForm() {
  const router = useRouter();
  const config = usePublicConfig();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [organization, setOrganization] = useState("");
  const [timezone, setTimezone] = useState(browserTimeZone);
  const [sampleData, setSampleData] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [navigating, setNavigating] = useState(false);
  const zones = useMemo(() => timeZones(timezone), [timezone]);
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();

  const signup = useAction(async (body: SignupRequest) => {
    await api.auth.signup(body);
    setNavigating(true);
    router.replace("/");
  });
  const busy = signup.pending || navigating;

  if (config.data && !config.data.accounts.signup_enabled) {
    return (
      <>
        <Notice tone="info" title="Sign-up is closed">
          This deployment doesn&apos;t accept new workspaces. Ask an owner of an existing workspace to invite you.
        </Notice>
        <AuthFootnote>
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </AuthFootnote>
      </>
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const next: Errors = { ...checkNewPassword(password, confirm) };
    const parsed = SignupRequest.safeParse({ name, email, password, organization_name: organization, timezone, sample_data: sampleData });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "name" || key === "email" || key === "organization_name" || key === "timezone") next[key] ??= MESSAGES[key];
      }
    }
    if (Object.keys(next).length > 0 || !parsed.success) {
      setErrors(next);
      focusFirstError();
      return;
    }
    setErrors({});
    void signup.run(parsed.data);
  }

  return (
    <form ref={containerRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Your name" error={errors.name} required>
        {(control) => <Input {...control} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Work email" error={errors.email} required>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@restaurant.com"
          />
        )}
      </Field>
      <Field label="Password" error={errors.password} hint={PASSWORD_HINT} required>
        {(control) => (
          <Input {...control} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
      </Field>
      <Field label="Confirm password" error={errors.confirm} required>
        {(control) => (
          <Input {...control} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        )}
      </Field>
      <Field label="Restaurant name" error={errors.organization_name} required>
        {(control) => (
          <Input
            {...control}
            autoComplete="organization"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Saffron & Sage Kitchen"
          />
        )}
      </Field>
      <Field label="Time zone" error={errors.timezone} hint="Weekly budgets reset on your local Monday." required>
        {(control) => (
          <Select {...control} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Checkbox
        label="Start with sample data"
        description="Labelled sample suppliers, stock and usage history. One sample supplier is deliberately malicious, so you can watch TrustRail block it."
        checked={sampleData}
        onChange={(e) => setSampleData(e.target.checked)}
      />

      <ErrorSummary
        key={attempt}
        messages={[errors.name, errors.email, errors.password, errors.confirm, errors.organization_name, errors.timezone]}
      />
      {signup.error ? <ErrorNotice error={signup.error} title="Couldn't create your account" /> : null}

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
        Create account
      </Button>

      <AuthFootnote>
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </AuthFootnote>
    </form>
  );
}
