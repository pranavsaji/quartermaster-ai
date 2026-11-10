"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthFootnote } from "@/components/auth/AuthLayout";
import { checkNewPassword, PASSWORD_HINT, type PasswordErrors } from "@/components/auth/password";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { ApiRequestError } from "@/lib/http";
import { useLinkToken } from "@/lib/use-link-token";

function InvalidLink() {
  return (
    <>
      <Notice tone="review" title="This reset link can't be used">
        It may have expired, been used already, or been copied incompletely. Request a new link, or ask an owner of your workspace to issue
        one.
      </Notice>
      <AuthFootnote>
        <Link href="/forgot-password" className="font-medium text-accent hover:underline">
          Request a new link
        </Link>
      </AuthFootnote>
    </>
  );
}

/** Sets a new password with the one-time token from the link's `#token=…` fragment. */
export function ResetPasswordForm() {
  const token = useLinkToken();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [done, setDone] = useState(false);
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const reset = useAction(async (body: { token: string; password: string }) => {
    await api.auth.resetPassword(body);
    setDone(true);
  });

  if (token === undefined) return <Skeleton className="h-40" />;
  const rejected = reset.error instanceof ApiRequestError && reset.error.code === "RESET_LINK_INVALID";
  if (token === null || rejected) return <InvalidLink />;

  if (done) {
    return (
      <>
        <Notice tone="allow" live title="Password changed">
          Your password was changed and every existing session was signed out.
        </Notice>
        <ButtonLink href="/login" variant="primary" size="lg" className="mt-4 w-full">
          Sign in
        </ButtonLink>
      </>
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const next = checkNewPassword(password, confirm);
    if (next.password || next.confirm) {
      setErrors(next);
      focusFirstError();
      return;
    }
    setErrors({});
    void reset.run({ token, password });
  }

  return (
    <form ref={containerRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="New password" error={errors.password} hint={PASSWORD_HINT} required>
        {(control) => (
          <Input {...control} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
      </Field>
      <Field label="Confirm new password" error={errors.confirm} required>
        {(control) => (
          <Input {...control} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        )}
      </Field>
      <ErrorSummary key={attempt} messages={[errors.password, errors.confirm]} />
      {reset.error ? <ErrorNotice error={reset.error} title="Couldn't change the password" /> : null}
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={reset.pending}>
        Set new password
      </Button>
    </form>
  );
}
