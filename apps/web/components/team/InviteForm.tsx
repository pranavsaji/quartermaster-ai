"use client";

import { CreateInvitationRequest, INVITABLE_ROLES, type InvitationCreatedResponse, type Role } from "@qm/contracts";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, Select } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { ROLE_LABELS } from "@/lib/roles";

const ROLE_HELP: Record<Role, string> = {
  OWNER: "Owners approve and pay, edit the spend mandate and manage the team.",
  MANAGER: "Managers run procurement, stock, suppliers, deliveries and invoices — but can't approve or pay.",
  VIEWER: "Viewers can see everything and change nothing.",
};

/** Owner-only: invite someone by email with a role. The parent shows the one-time link. */
export function InviteForm({ onInvited }: { onInvited: (result: InvitationCreatedResponse) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MANAGER");
  const [error, setError] = useState<string | undefined>(undefined);
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const invite = useAction(async (body: CreateInvitationRequest) => {
    const result = await api.members.invite(body);
    setEmail("");
    onInvited(result);
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = CreateInvitationRequest.safeParse({ email, role });
    if (!parsed.success) {
      setError("Enter a valid email address.");
      focusFirstError();
      return;
    }
    setError(undefined);
    void invite.run(parsed.data);
  }

  return (
    <form ref={containerRef} onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Invite someone">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-start">
        <Field label="Email" error={error} required>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="chef@restaurant.com"
            />
          )}
        </Field>
        <Field label="Role" hint={ROLE_HELP[role]}>
          {(control) => (
            <Select {...control} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" variant="primary" loading={invite.pending} className="sm:mt-[26px]">
          Send invitation
        </Button>
      </div>
      <ErrorSummary key={attempt} messages={[error]} />
      <ErrorNotice error={invite.error} title="Couldn't invite them" />
    </form>
  );
}
