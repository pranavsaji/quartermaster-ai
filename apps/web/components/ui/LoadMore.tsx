import type { PagedState } from "@/lib/hooks";
import { num } from "@/lib/format";
import { Button } from "./Button";
import { cn } from "./cn";
import { ErrorNotice } from "./ErrorNotice";

/**
 * Footer for a cursor-paginated list: says how many rows are loaded when more
 * exist (so a list is never silently cut short) and loads the next page.
 */
export function LoadMore<T>({ state, noun = "rows", className }: { state: PagedState<T>; noun?: string; className?: string }) {
  if (state.stale || !state.items || (!state.hasMore && !state.moreError)) return null;
  return (
    <div className={cn("mt-3 flex flex-col items-center gap-2", className)}>
      {state.moreError ? <ErrorNotice error={state.moreError} title="Couldn't load more" className="w-full" /> : null}
      {state.hasMore ? (
        <>
          <p className="text-[12.5px] text-ink-3" role="status">
            Showing the first {num(state.items.length)} {noun}. More are available.
          </p>
          <Button variant="secondary" size="sm" onClick={state.loadMore} loading={state.loadingMore}>
            {state.moreError ? "Try loading more again" : "Load more"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
