import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Page not found" };

/** A console link that leads nowhere: shown inside the app shell, with a way back to work. */
export default function ConsoleNotFound() {
  return (
    <div className="mx-auto mt-12 max-w-lg">
      <EmptyState
        icon="search"
        title="We couldn't find that page"
        description="The link may be out of date, or the page has moved."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/procurement" variant="primary">
              Back to requests
            </ButtonLink>
            <ButtonLink href="/">Go to the overview</ButtonLink>
          </div>
        }
      />
    </div>
  );
}
