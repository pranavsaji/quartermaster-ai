import type { Metadata } from "next";
import { Brand } from "@/components/shell/Sidebar";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-md px-4 text-center">
      <div className="mb-8 flex justify-center">
        <Brand />
      </div>
      <h1 className="text-xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-3">That page doesn&apos;t exist, or the link is out of date.</p>
      <p className="mt-6">
        <ButtonLink href="/" variant="primary">
          Back to the overview
        </ButtonLink>
      </p>
    </main>
  );
}
