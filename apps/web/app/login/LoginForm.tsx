"use client";

import { LoginRequest } from "@qm/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";

const DEMO_ACCOUNTS = [
  { role: "Owner", email: "owner@demo.quartermaster.dev" },
  { role: "Manager", email: "manager@demo.quartermaster.dev" },
  { role: "Viewer", email: "viewer@demo.quartermaster.dev" },
];

/** Only allow same-origin relative redirects, never `//evil.example`. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const login = useAction(async (body: LoginRequest) => {
    await api.auth.login(body);
    router.replace(next);
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = LoginRequest.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "email") errs.email = "Enter a valid email address.";
        if (key === "password") errs.password = "Password must be at least 8 characters.";
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    void login.run(parsed.data);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={fieldErrors.email} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            placeholder="owner@demo.quartermaster.dev"
          />
        )}
      </Field>
      <Field label="Password" error={fieldErrors.password} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>

      {login.error ? <ErrorNotice error={login.error} title="Sign-in failed" /> : null}

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={login.pending}>
        Sign in
      </Button>

      <div className="rounded-lg border border-line bg-canvas px-3.5 py-3 text-[12.5px] text-ink-3">
        <p className="font-medium text-ink-2">
          Demo accounts: owner@demo.quartermaster.dev / manager@… / viewer@…
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => setEmail(a.email)}
                className="rounded-md border border-line-strong bg-surface px-2 py-1 font-mono text-[11.5px] text-ink-2 hover:border-accent-line hover:text-accent-strong"
                aria-label={`Use the ${a.role} demo account email`}
              >
                {a.role.toLowerCase()}@…
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2">All demo accounts share the <code className="font-mono">DEMO_USER_PASSWORD</code> set when seeding.</p>
      </div>
    </form>
  );
}
