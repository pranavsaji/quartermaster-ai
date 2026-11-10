import type { ReactNode } from "react";

/**
 * Page title row. Actions sit top-right beside the title (and wrap under it on a phone, primary
 * first: pages list their primary action before the Refresh icon).
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small row above the title (breadcrumb, badges). */
  meta?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {meta ? <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">{meta}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 sm:gap-x-6">
        <div className="min-w-0 flex-1 basis-60">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm text-ink-3">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
