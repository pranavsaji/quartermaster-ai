import type { ReactNode } from "react";

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {meta ? <div className="mb-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-ink-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
