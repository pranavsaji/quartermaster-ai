import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your workspace"
      description="Set up your restaurant, then let the agent restock within the limits you sign off."
    >
      <SignupForm />
    </AuthLayout>
  );
}
