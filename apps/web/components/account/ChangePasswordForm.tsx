"use client";

import { useState, type FormEvent } from "react";
import { checkNewPassword, PASSWORD_HINT, type PasswordErrors } from "@/components/auth/password";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { ApiRequestError } from "@/lib/http";

type Errors = PasswordErrors & { current?: string };

/** Change the signed-in user's password. Other sessions are signed out by the API; this one stays. */
export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [changed, setChanged] = useState(false);
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const change = useAction(async (body: { current_password: string; new_password: string }) => {
    try {
      await api.auth.changePassword(body);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "INVALID_CURRENT_PASSWORD") {
        setErrors({ current: "That isn't your current password." });
        focusFirstError();
        return;
      }
      throw err;
    }
    setCurrent("");
    setPassword("");
    setConfirm("");
    setChanged(true);
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Errors = checkNewPassword(password, confirm);
    if (!current) next.current = "Enter your current password.";
    else if (!next.password && current === password) next.password = "Choose a password different from the current one.";
    if (next.current || next.password || next.confirm) {
      setErrors(next);
      focusFirstError();
      return;
    }
    setErrors({});
    setChanged(false);
    void change.run({ current_password: current, new_password: password });
  }

  return (
    <form ref={containerRef} onSubmit={onSubmit} noValidate className="max-w-sm space-y-4">
      <Field label="Current password" error={errors.current} required>
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
      </Field>
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
      <ErrorSummary key={attempt} messages={[errors.current, errors.password, errors.confirm]} />
      <ErrorNotice error={change.error} title="Password not changed" />
      {changed ? (
        <Notice tone="allow" live>
          Password changed. Your other sessions were signed out.
        </Notice>
      ) : null}
      <Button type="submit" variant="primary" loading={change.pending}>
        Change password
      </Button>
    </form>
  );
}
