"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Notice } from "./Notice";

export interface ErrorFocus<E extends HTMLElement> {
  /** Attach to the element that contains the form's controls and its `ErrorSummary`. */
  containerRef: RefObject<E | null>;
  /**
   * Call after a submit failed validation. Once the errors have rendered, focus
   * moves to the first control marked `aria-invalid`, or to the summary when the
   * error belongs to a group rather than one control.
   */
  focusFirstError: () => void;
  /** Changes on every failed submit; key the summary with it so a repeated failure is announced again. */
  attempt: number;
}

/** Moves focus to the first invalid control after a failed submit (see `ErrorSummary`). */
export function useErrorFocus<E extends HTMLElement = HTMLDivElement>(): ErrorFocus<E> {
  const containerRef = useRef<E | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt === 0) return;
    const root = containerRef.current;
    if (!root) return;
    const target =
      root.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)') ?? root.querySelector<HTMLElement>("[data-error-summary]");
    target?.focus();
  }, [attempt]);

  const focusFirstError = useCallback(() => setAttempt((n) => n + 1), []);
  return { containerRef, focusFirstError, attempt };
}

/**
 * Live summary of a form's validation errors, announced when a submit fails.
 * Each message is also shown next to its field (and referenced by the control's
 * `aria-describedby`), so the summary only needs to say what to fix.
 */
export function ErrorSummary({ messages, className }: { messages: Array<string | null | undefined | false>; className?: string }) {
  const unique = Array.from(new Set(messages.filter((m): m is string => Boolean(m))));
  if (unique.length === 0) return null;
  const title = unique.length === 1 ? "There is a problem to fix" : `There are ${unique.length} problems to fix`;
  return (
    <div data-error-summary tabIndex={-1} className="focus-visible:outline-offset-1">
      <Notice tone="block" live title={title} className={className}>
        {unique.length === 1 ? (
          <p>{unique[0]}</p>
        ) : (
          <ul className="list-disc space-y-0.5 pl-4">
            {unique.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </Notice>
    </div>
  );
}
