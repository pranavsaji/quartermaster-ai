"use client";

import { INVITABLE_ROLES, type InvitationCreatedResponse, type InvitationDto, type MemberDto, type Role } from "@qm/contracts";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { InviteForm } from "@/components/team/InviteForm";
import { OneTimeLink } from "@/components/team/OneTimeLink";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { date, dateTime } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import { INVITATION_STATUS_TONES, lookup } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/roles";

type IssuedLink = { kind: "invite" | "reset"; url: string | null; emailSent: boolean; recipient: string };

export function TeamPage() {
  const { can } = useSession();
  const manage = can("manageTeam");
  const team = useResource((signal) => api.members.list({ signal }), []);
  const [link, setLink] = useState<IssuedLink | null>(null);
  const [removing, setRemoving] = useState<MemberDto | null>(null);

  const members = team.data?.members;
  const pending = team.data?.invitations.filter((i) => i.status === "PENDING") ?? [];

  function onInvited(result: InvitationCreatedResponse) {
    setLink({ kind: "invite", url: result.invite_url, emailSent: result.email_sent, recipient: result.invitation.email });
    team.setData((prev) => ({
      members: prev?.members ?? [],
      invitations: [result.invitation, ...(prev?.invitations ?? []).filter((i) => i.id !== result.invitation.id)],
    }));
  }

  function replaceMember(member: MemberDto) {
    team.setData((prev) => ({
      members: (prev?.members ?? []).map((m) => (m.user_id === member.user_id ? member : m)),
      invitations: prev?.invitations ?? [],
    }));
  }

  function replaceInvitation(invitation: InvitationDto) {
    team.setData((prev) => ({
      members: prev?.members ?? [],
      invitations: (prev?.invitations ?? []).map((i) => (i.id === invitation.id ? invitation : i)),
    }));
  }

  return (
    <>
      <PageHeader
        title="Team"
        description={
          manage
            ? "Invite the people who run the kitchen with you and choose what each of them can do."
            : "Who has access to this workspace. Owners manage invitations and roles."
        }
        actions={
          <Button variant="secondary" onClick={team.reload} loading={team.refreshing}>
            Refresh
          </Button>
        }
      />

      {link ? (
        <OneTimeLink
          className="mb-4"
          title={
            link.kind === "invite"
              ? `Invitation ready for ${link.recipient}`
              : link.url === null
                ? `Reset link sent to ${link.recipient}`
                : `Reset link ready for ${link.recipient}`
          }
          url={link.url}
          emailSent={link.emailSent}
          recipient={link.recipient}
        />
      ) : null}

      <div className="space-y-6">
        {manage ? (
          <Card aria-labelledby="invite-title">
            <CardHeader id="invite-title" title="Invite someone" description="They choose their own name and password from the link." />
            <CardBody>
              <InviteForm onInvited={onInvited} />
            </CardBody>
          </Card>
        ) : null}

        <Card aria-labelledby="members-title">
          <CardHeader id="members-title" title="Members" />
          <CardBody>
            <ResourceView resource={team} hasData={Boolean(members)} loading={<SkeletonRows rows={3} />}>
              {members ? (
                <MembersTable
                  members={members}
                  manage={manage}
                  onChanged={replaceMember}
                  onRemove={setRemoving}
                  onResetLink={(m, r) => setLink({ kind: "reset", url: r.url, emailSent: r.emailSent, recipient: m.email })}
                />
              ) : null}
            </ResourceView>
          </CardBody>
        </Card>

        {manage ? (
          <Card aria-labelledby="invitations-title">
            <CardHeader
              id="invitations-title"
              title="Pending invitations"
              description="Links expire on their own; revoke one to stop it working sooner."
            />
            <CardBody>
              {team.data ? (
                pending.length === 0 ? (
                  <EmptyState compact title="No pending invitations" />
                ) : (
                  <InvitationsTable invitations={pending} onRevoked={replaceInvitation} />
                )
              ) : (
                <SkeletonRows rows={2} />
              )}
            </CardBody>
          </Card>
        ) : null}
      </div>

      {removing ? (
        <RemoveMemberDialog
          member={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null);
            team.reload();
          }}
        />
      ) : null}
    </>
  );
}

function MembersTable({
  members,
  manage,
  onChanged,
  onRemove,
  onResetLink,
}: {
  members: MemberDto[];
  manage: boolean;
  onChanged: (member: MemberDto) => void;
  onRemove: (member: MemberDto) => void;
  onResetLink: (member: MemberDto, link: { url: string | null; emailSent: boolean }) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <caption className="sr-only">Workspace members</caption>
        <thead className="border-b border-line text-[11.5px] text-ink-3">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">
              Name
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Role
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Joined
            </th>
            {manage ? (
              <th scope="col" className="py-2 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {members.map((m) => (
            <MemberRow key={m.user_id} member={m} manage={manage} onChanged={onChanged} onRemove={onRemove} onResetLink={onResetLink} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberRow({
  member: m,
  manage,
  onChanged,
  onRemove,
  onResetLink,
}: {
  member: MemberDto;
  manage: boolean;
  onChanged: (member: MemberDto) => void;
  onRemove: (member: MemberDto) => void;
  onResetLink: (member: MemberDto, link: { url: string | null; emailSent: boolean }) => void;
}) {
  const setRole = useAction(async (role: Role) => onChanged((await api.members.setRole(m.user_id, role)).member));
  const reset = useAction(async () => {
    const r = await api.members.resetLink(m.user_id);
    onResetLink(m, { url: r.reset_url, emailSent: r.email_sent });
  });
  const roleLabel = lookup(ROLE_LABELS, m.role, m.role);
  return (
    <tr>
      <td className="py-2.5 pr-3 align-top">
        <p className="font-medium text-ink">
          {m.name}
          {m.is_self ? (
            <Badge tone="neutral" className="ml-2">
              You
            </Badge>
          ) : null}
        </p>
        <p className="text-[12px] text-ink-3">{m.email}</p>
      </td>
      <td className="py-2.5 pr-3 align-top">
        {manage ? (
          <Select
            aria-label={`Role for ${m.name}`}
            value={m.role}
            disabled={setRole.pending}
            onChange={(e) => void setRole.run(e.target.value as Role)}
            className="w-36"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        ) : (
          <Badge tone={m.role === "OWNER" ? "accent" : "neutral"}>{roleLabel}</Badge>
        )}
        <ErrorNotice error={setRole.error} title="Role not changed" className="mt-2" />
      </td>
      <td className="py-2.5 pr-3 align-top text-ink-2">{date(m.joined_at)}</td>
      {manage ? (
        <td className="py-2.5 text-right align-top">
          <div className="flex justify-end gap-2">
            {/* Owners reset their own passwords: a link for another owner would take over their account. */}
            {m.role !== "OWNER" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void reset.run()}
                loading={reset.pending}
                aria-label={`Reset link for ${m.name}`}
              >
                Reset link
              </Button>
            ) : null}
            {!m.is_self ? (
              <Button size="sm" variant="danger" onClick={() => onRemove(m)} aria-label={`Remove ${m.name}`}>
                Remove
              </Button>
            ) : null}
          </div>
          <ErrorNotice error={reset.error} title="No reset link issued" className="mt-2 text-left" />
        </td>
      ) : null}
    </tr>
  );
}

function InvitationsTable({ invitations, onRevoked }: { invitations: InvitationDto[]; onRevoked: (invitation: InvitationDto) => void }) {
  return (
    <ul className="divide-y divide-line">
      {invitations.map((inv) => (
        <InvitationRow key={inv.id} invitation={inv} onRevoked={onRevoked} />
      ))}
    </ul>
  );
}

function InvitationRow({ invitation: inv, onRevoked }: { invitation: InvitationDto; onRevoked: (invitation: InvitationDto) => void }) {
  const revoke = useAction(async () => onRevoked((await api.members.revokeInvitation(inv.id)).invitation));
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[13px]">
      <div className="min-w-0">
        <p className="font-medium text-ink">{inv.email}</p>
        <p className="text-[12px] text-ink-3">
          {lookup(ROLE_LABELS, inv.role, inv.role)}
          {inv.invited_by_name ? ` · invited by ${inv.invited_by_name}` : ""} · expires {dateTime(inv.expires_at)}
        </p>
        <ErrorNotice error={revoke.error} title="Invitation not revoked" className="mt-2" />
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={inv.status} tones={INVITATION_STATUS_TONES} kind="Invitation" />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void revoke.run()}
          loading={revoke.pending}
          aria-label={`Revoke invitation for ${inv.email}`}
        >
          Revoke
        </Button>
      </div>
    </li>
  );
}

function RemoveMemberDialog({ member, onClose, onRemoved }: { member: MemberDto; onClose: () => void; onRemoved: () => void }) {
  const remove = useAction(async () => {
    await api.members.remove(member.user_id);
    onRemoved();
  });
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`Remove ${member.name}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void remove.run()} loading={remove.pending}>
            Remove from workspace
          </Button>
        </>
      }
    >
      <Notice tone="review">
        {member.email} loses access immediately and is signed out. Their past approvals and actions stay in the audit trail.
      </Notice>
      <ErrorNotice error={remove.error} title="Not removed" className="mt-3" />
    </Dialog>
  );
}
