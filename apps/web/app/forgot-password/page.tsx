import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Reset your password" description="We'll email you a one-time link to choose a new password.">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
