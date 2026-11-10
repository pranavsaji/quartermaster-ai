import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AcceptInvitation } from "./AcceptInvitation";

export const metadata: Metadata = { title: "Join a workspace" };

export default function InvitePage() {
  return (
    <AuthLayout title="Join your team" description="Create your login to accept the invitation.">
      <AcceptInvitation />
    </AuthLayout>
  );
}
