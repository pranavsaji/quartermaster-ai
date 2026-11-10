"use client";

import type { ReactNode } from "react";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { useSession } from "@/components/session/SessionProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { lookup } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/roles";

export function AccountPage() {
  const { user } = useSession();
  const rows: [string, ReactNode][] = [
    ["Name", user.name],
    ["Email", user.email],
    ["Workspace", user.organization.name],
    [
      "Role",
      <Badge key="role" tone={user.role === "OWNER" ? "accent" : "neutral"}>
        {lookup(ROLE_LABELS, user.role, user.role)}
      </Badge>,
    ],
    ["Time zone", user.organization.timezone],
  ];
  return (
    <>
      <PageHeader title="Your account" description="Your sign-in details. Owners change roles from the Team page." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="profile-title">
          <CardHeader id="profile-title" title="Profile" />
          <CardBody>
            <dl className="space-y-3 text-[13px]">
              {rows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[110px_1fr] gap-3">
                  <dt className="text-ink-3">{label}</dt>
                  <dd className="text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
        <Card aria-labelledby="password-title">
          <CardHeader id="password-title" title="Password" description="Changing it signs out your other sessions." />
          <CardBody>
            <ChangePasswordForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
