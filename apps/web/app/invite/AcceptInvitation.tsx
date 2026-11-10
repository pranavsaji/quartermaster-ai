"use client";

import type { InvitationPreviewDto } from "@qm/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFootnote } from "@/components/auth/AuthLayout";
import { checkNewPassword, PASSWORD_HINT, type PasswordErrors } from "@/components/auth/password";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import { ApiRequestError } from "@/lib/http";
import { lookup } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/roles";
import { useLinkToken } from "@/lib/use-link-token";

const isInvalid = (error: unknown) => error instanceof ApiRequestError && error.code === "INVITATION_INVALID";

function InvalidInvitation() {
  return (
    <>
      <Notice tone="review" title="This invitation can't be used">
        It may have expired, been revoked or accepted already, or been copied incompletely. Ask the person who invited you for a new link.
      </Notice>
      <AuthFootnote>
        <Link href="/login" className="font-medium text-accent hover:underline">
          Go to sign in
        </Link>
      </AuthFootnote>
    </>
  );
}

/**
 * Accepts an invitation from the link's `#token=…` fragment: shows which workspace and role it is
 * for, then creates the invitee's login (name and password) and signs them in.
 */
export function AcceptInvitation() {
  const token = useLinkToken();
  const preview = useResource(
    async (signal) => {
      if (!token) throw new Error("No invitation token");
      return (await api.invitations.lookup({ token }, { signal })).invitation;
    },
    [token],
    { enabled: Boolean(token) },
  );

  if (token === undefined) return <Skeleton className="h-48" />;
  if (token === null || isInvalid(preview.error)) return <InvalidInvitation />;
  if (preview.error) return <ErrorNotice error={preview.error} onRetry={preview.reload} title="Couldn't open the invitation" />;
  if (!preview.data) return <Skeleton className="h-48" />;
  return <AcceptForm token={token} invitation={preview.data} />;
}

function AcceptForm({ token, invitation }: { token: string; invitation: InvitationPreviewDto }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<PasswordErrors & { name?: string }>({});
  const [navigating, setNavigating] = useState(false);
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const accept = useAction(async (body: { token: string; name: string; password: string }) => {
    await api.invitations.accept(body);
    setNavigating(true);
    router.replace("/");
  });

  if (isInvalid(accept.error)) return <InvalidInvitation />;
  const role = lookup(ROLE_LABELS, invitation.role, invitation.role);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (accept.pending || navigating) return;
    const next: PasswordErrors & { name?: string } = checkNewPassword(password, confirm);
    if (!name.trim()) next.name = "Enter your name.";
    else if (name.trim().length > 120) next.name = "Use at most 120 characters.";
    if (next.name || next.password || next.confirm) {
      setErrors(next);
      focusFirstError();
      return;
    }
    setErrors({});
    void accept.run({ token, name: name.trim(), password });
  }

  return (
    <form ref={containerRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="rounded-lg border border-line bg-canvas px-3.5 py-3 text-[13px]">
        <p className="font-medium text-ink">{invitation.organization_name}</p>
        <p className="mt-0.5 text-ink-3">
          {invitation.invited_by_name ?? "An owner"} invited <span className="font-medium text-ink-2">{invitation.email}</span> to join as{" "}
          <span className="font-medium text-ink-2">{role}</span>.
        </p>
        <p className="mt-0.5 text-[12px] text-ink-4">Expires {dateTime(invitation.expires_at)}</p>
      </div>
      <Field label="Email" hint="Invitations are for one address.">
        {(control) => <Input {...control} type="email" value={invitation.email} readOnly autoComplete="username" />}
      </Field>
      <Field label="Your name" error={errors.name} required>
        {(control) => <Input {...control} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
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
      <ErrorSummary key={attempt} messages={[errors.name, errors.password, errors.confirm]} />
      {accept.error ? <ErrorNotice error={accept.error} title="Couldn't accept the invitation" /> : null}
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={accept.pending || navigating}>
        Join {invitation.organization_name}
      </Button>
    </form>
  );
}
