import type { ReactNode } from "react";
import { ErrorNotice } from "./ErrorNotice";
import { RefreshErrorNotice } from "./RefreshErrorNotice";

/** The parts of `useResource` / `usePagedResource` state this view needs. */
export interface ResourceLike {
  error: unknown;
  updatedAt: number | undefined;
  reload: () => void;
}

/**
 * The standard states of a loaded section, in one place:
 * - nothing loaded and the load failed → an error notice with Retry;
 * - nothing loaded yet → `loading` (omit it when the child renders its own loading state, e.g. a grid);
 * - data on screen but the latest refresh failed → a "showing data from …" notice above the data;
 * - otherwise → `children`.
 */
export function ResourceView({
  resource,
  hasData,
  loading,
  errorTitle,
  className,
  children,
}: {
  resource: ResourceLike;
  /** Whether usable data (not stale data from a previous filter) is on screen. */
  hasData: boolean;
  loading?: ReactNode;
  errorTitle?: string;
  /** Spacing below the refresh notice (and below the error notice when there are no children). */
  className?: string;
  children?: ReactNode;
}) {
  const spacing = className ?? "mb-3";
  if (!hasData && resource.error) {
    return <ErrorNotice error={resource.error} onRetry={resource.reload} title={errorTitle} className={children ? undefined : spacing} />;
  }
  if (!hasData && loading !== undefined) return <>{loading}</>;
  return (
    <>
      <RefreshErrorNotice
        error={resource.error}
        hasData={hasData}
        updatedAt={resource.updatedAt}
        onRetry={resource.reload}
        className={spacing}
      />
      {children}
    </>
  );
}
