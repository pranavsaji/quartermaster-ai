"use client";

import type { InvitationCreatedResponse, InvitationDto, MemberDto } from "@qm/contracts";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { InviteForm } from "@/components/team/InviteForm";
import { MembersGrid, type MemberGridHandlers } from "@/components/team/MembersGrid";
import { OneTimeLink } from "@/components/team/OneTimeLink";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
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

  const [memberError, setMemberError] = useState<{ title: string; error: unknown } | null>(null);
  const setTeam = team.setData;
  // Stable, so the grid's columns are not rebuilt on every render.
  const handlers = useMemo<MemberGridHandlers>(
    () => ({
      onChanged: (member) => {
        setMemberError(null);
        setTeam((prev) => ({
          members: (prev?.members ?? []).map((m) => (m.user_id === member.user_id ? member : m)),
          invitations: prev?.invitations ?? [],
        }));
      },
      onRemove: (member) => setRemoving(member),
      onResetLink: (member, r) => {
        setMemberError(null);
        setLink({ kind: "reset", url: r.url, emailSent: r.emailSent, recipient: member.email });
      },
      onError: (title, error) => setMemberError({ title, error }),
    }),
    [setTeam],
  );

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
        actions={<RefreshButton onClick={team.reload} loading={team.refreshing} />}
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
              {memberError ? <ErrorNotice error={memberError.error} title={memberError.title} className="mb-3" /> : null}
              {members ? <MembersGrid members={members} manage={manage} handlers={handlers} /> : null}
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
                  <EmptyState
                    compact
                    icon="team"
                    title="No pending invitations"
                    description="People you invite show up here until they join."
                  />
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
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-ink">{inv.email}</p>
        <p className="text-xs text-ink-3">
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
