import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Choose a new password" description="Signing in again is required everywhere once the password changes.">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
