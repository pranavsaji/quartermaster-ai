"use client";

import { LoginRequest } from "@qm/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { AuthFootnote } from "@/components/auth/AuthLayout";
import { usePublicConfig } from "@/components/auth/usePublicConfig";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { safeNext } from "@/lib/redirect";

/** The shared sample workspace's logins, shown only when the deployment says so (`sample_accounts_hint`). */
const DEMO_ACCOUNTS = [
  { role: "Owner", email: "owner@demo.quartermaster.dev" },
  { role: "Manager", email: "manager@demo.quartermaster.dev" },
  { role: "Viewer", email: "viewer@demo.quartermaster.dev" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const config = usePublicConfig().data;
  const showSampleAccounts = config?.sample_accounts_hint ?? false;

  // Stays true after a successful sign-in until the console replaces this page, so the button
  // can't be pressed again (and start a second session) while the navigation is under way.
  const [navigating, setNavigating] = useState(false);
  const login = useAction(async (body: LoginRequest) => {
    await api.auth.login(body);
    setNavigating(true);
    router.replace(safeNext(params.get("next"), window.location.origin));
  });
  const busy = login.pending || navigating;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = LoginRequest.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "email") errs.email = "Enter a valid email address.";
        if (key === "password") errs.password = "Password must be at least 8 characters.";
      }
      setFieldErrors(errs);
      focusFirstError();
      return;
    }
    setFieldErrors({});
    void login.run(parsed.data);
  }

  return (
    <form ref={containerRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={fieldErrors.email} required>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={showSampleAccounts ? "owner@demo.quartermaster.dev" : "you@restaurant.com"}
          />
        )}
      </Field>
      <Field
        label="Password"
        error={fieldErrors.password}
        required
        hint={
          <Link href="/forgot-password" className="font-medium text-accent hover:underline">
            Forgot password?
          </Link>
        }
      >
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>

      <ErrorSummary key={attempt} messages={[fieldErrors.email, fieldErrors.password]} />
      {login.error ? <ErrorNotice error={login.error} title="Sign-in failed" /> : null}

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
        Sign in
      </Button>

      {showSampleAccounts ? <DemoAccounts onPick={setEmail} /> : null}

      {config?.accounts.signup_enabled ? (
        <AuthFootnote>
          New to Quartermaster?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </AuthFootnote>
      ) : null}
    </form>
  );
}

function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3.5 py-3 text-[12.5px] text-ink-3">
      <p className="font-medium text-ink-2">Sample workspace: owner@demo.quartermaster.dev / manager@… / viewer@…</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.email}>
            <button
              type="button"
              onClick={() => onPick(a.email)}
              className="rounded-md border border-line-strong bg-surface px-2 py-1 font-mono text-[11.5px] text-ink-2 hover:border-accent-line hover:text-accent-strong"
              aria-label={`Use the ${a.role} sample account email`}
            >
              {a.role.toLowerCase()}@…
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2">All three share one password, published with this deployment&apos;s instructions.</p>
    </div>
  );
}
