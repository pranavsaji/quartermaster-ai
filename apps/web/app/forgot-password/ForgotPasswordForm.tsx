"use client";

import { ForgotPasswordRequest } from "@qm/contracts";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthFootnote } from "@/components/auth/AuthLayout";
import { usePublicConfig } from "@/components/auth/usePublicConfig";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";

function BackToSignIn() {
  return (
    <AuthFootnote>
      <Link href="/login" className="font-medium text-accent hover:underline">
        Back to sign in
      </Link>
    </AuthFootnote>
  );
}

/**
 * Self-service reset by email. The API answers the same way whether or not the address has an
 * account, so the confirmation never says which. Without outbound email on this deployment, the
 * page explains the alternative: an owner issues a one-time reset link from the Team page.
 */
export function ForgotPasswordForm() {
  const config = usePublicConfig();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const send = useAction(async (body: ForgotPasswordRequest) => {
    await api.auth.forgotPassword(body);
    setSentTo(body.email);
  });

  if (!config.data && !config.error) return <Skeleton className="h-32" />;

  if (config.data && !config.data.accounts.email_enabled) {
    return (
      <>
        <Notice tone="info" title="Ask an owner for a reset link">
          This deployment doesn&apos;t send email. An owner of your workspace can issue you a one-time reset link from the Team page.
        </Notice>
        <BackToSignIn />
      </>
    );
  }

  if (sentTo) {
    return (
      <>
        <Notice tone="allow" live title="Check your email">
          If an account exists for {sentTo}, we&apos;ve sent a link to reset its password. The link works once and expires soon.
        </Notice>
        <BackToSignIn />
      </>
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = ForgotPasswordRequest.safeParse({ email });
    if (!parsed.success) {
      setError("Enter a valid email address.");
      focusFirstError();
      return;
    }
    setError(undefined);
    void send.run(parsed.data);
  }

  return (
    <form ref={containerRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={error} required>
        {(control) => <Input {...control} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <ErrorSummary key={attempt} messages={[error]} />
      {send.error ? <ErrorNotice error={send.error} title="Couldn't send the reset link" /> : null}
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={send.pending}>
        Email me a reset link
      </Button>
      <BackToSignIn />
    </form>
  );
}
