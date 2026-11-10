import { CopyValue } from "@/components/ui/CopyValue";
import { Notice } from "@/components/ui/Notice";

/**
 * A one-time link (invitation or password reset) the API returns once. The owner copies it to
 * pass on; whether it was also emailed depends on this deployment's email setup. A reset link
 * that was emailed is not returned at all (`url` null): only the member sees it.
 */
export function OneTimeLink({
  title,
  url,
  emailSent,
  recipient,
  className,
}: {
  title: string;
  url: string | null;
  emailSent: boolean;
  recipient: string;
  className?: string;
}) {
  return (
    <Notice tone="allow" live title={title} className={className}>
      {url === null ? (
        <p>We emailed the link to {recipient}. It works once and expires within the hour.</p>
      ) : (
        <>
          <p>
            {emailSent
              ? `We emailed this link to ${recipient}. You can also copy it and send it yourself.`
              : `Email isn't set up on this deployment, so copy the link and send it to ${recipient} yourself.`}{" "}
            It works once, and won&apos;t be shown again.
          </p>
          <div className="mt-2">
            <CopyValue value={url} label="link" head={36} tail={10} />
          </div>
        </>
      )}
    </Notice>
  );
}
