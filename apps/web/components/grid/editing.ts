"use client";

import type { CellValueChangedEvent, ValueParserParams } from "ag-grid-community";
import { useCallback, useRef, useState } from "react";
import { inputToMinor } from "@/lib/format";
import { describeError } from "@/lib/http";

/**
 * In-place editing for AG Grid tables whose rows are API resources. Each edited cell is saved
 * through the API at once; the grid shows the server's answer (flashing the cell), or puts the
 * old value back and explains why when the API refuses. An explicit undo replays the previous
 * value through the same API, so it works even after the grid's own Ctrl/Cmd+Z history is reset.
 */

/** A whole number within [min, max] typed into a cell, or null when it is not one. */
export function parseWholeNumber(value: unknown, min: number, max: number): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim().replace(/,/g, "") : "";
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

/** valueParser for whole-number cells: anything else keeps the old value (no save happens). */
export function wholeNumberParser(min: number, max: number) {
  return (p: ValueParserParams): unknown => parseWholeNumber(p.newValue, min, max) ?? p.oldValue;
}

/** valueParser for money cells typed in dollars ("54", "$54.00", "1,234.50"): minor units, or the old value. */
export function moneyParser(currency: string, max = 100_000_000) {
  return (p: ValueParserParams): unknown => {
    const minor = typeof p.newValue === "string" ? inputToMinor(p.newValue, currency) : null;
    return minor !== null && minor > 0 && minor <= max ? minor : p.oldValue;
  };
}

export interface EditRecord {
  id: string;
  field: string;
  label: string;
  from: unknown;
  to: unknown;
}

export interface InlineEditorOptions<T extends { id: string }> {
  /** Saves one changed field. `before` is the row as it was before this edit. Throws on refusal. */
  save: (before: T, field: string, value: unknown) => Promise<T>;
  /** Called with the server's version of a saved row, so the page's state stays in step. */
  onSaved: (row: T) => void;
  /** Current rows, for undo. */
  rows: T[] | undefined;
  /** Short name of a row for messages ("Fryer oil 20 L"). */
  describe: (row: T) => string;
  /** Column header for messages ("Safety stock"). */
  label: (field: string) => string;
}

export interface InlineEditor<T> {
  onCellValueChanged: (e: CellValueChangedEvent<T>) => void;
  /** Last outcome, for a live region above the grid. */
  status: { tone: "allow" | "block"; text: string } | null;
  saving: boolean;
  lastEdit: EditRecord | null;
  undo: () => Promise<void>;
  clearStatus: () => void;
}

export function useInlineEditor<T extends { id: string }>(options: InlineEditorOptions<T>): InlineEditor<T> {
  const { save, onSaved, rows, describe, label } = options;
  const [status, setStatus] = useState<InlineEditor<T>["status"]>(null);
  const [pending, setPending] = useState(0);
  const [history, setHistory] = useState<EditRecord[]>([]);
  // Saves for the same row run one after another, so a fast second edit never races the first.
  const queue = useRef(new Map<string, Promise<unknown>>());

  const run = useCallback((id: string, work: () => Promise<void>) => {
    const prev = queue.current.get(id) ?? Promise.resolve();
    const next = prev.then(work, work).finally(() => {
      if (queue.current.get(id) === next) queue.current.delete(id);
    });
    queue.current.set(id, next);
    return next;
  }, []);

  const onCellValueChanged = useCallback(
    (e: CellValueChangedEvent<T>) => {
      const field = e.colDef.field;
      if (!field || !e.data || Object.is(e.oldValue, e.newValue)) return;
      const before = { ...e.data, [field]: e.oldValue } as T;
      const node = e.node;
      const api = e.api;
      setPending((n) => n + 1);
      void run(before.id, async () => {
        try {
          const saved = await save(before, field, e.newValue);
          // Same object in the grid and in page state: the grid sees no further change.
          node.setData(saved);
          onSaved(saved);
          api.flashCells({ rowNodes: [node], columns: [field] });
          setHistory((h) => [...h.slice(-19), { id: before.id, field, label: label(field), from: e.oldValue, to: e.newValue }]);
          setStatus({ tone: "allow", text: `Saved ${label(field).toLowerCase()} for ${describe(saved)}.` });
        } catch (err) {
          node.setData(before);
          setStatus({ tone: "block", text: `${label(field)} for ${describe(before)} was not saved: ${describeError(err)}` });
        } finally {
          setPending((n) => n - 1);
        }
      });
    },
    [run, save, onSaved, describe, label],
  );

  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last) return;
    const row = rows?.find((r) => r.id === last.id);
    if (!row) {
      setHistory((h) => h.slice(0, -1));
      return;
    }
    setPending((n) => n + 1);
    await run(row.id, async () => {
      try {
        const saved = await save(row, last.field, last.from);
        onSaved(saved);
        setHistory((h) => h.slice(0, -1));
        setStatus({ tone: "allow", text: `Undid the ${last.label.toLowerCase()} change for ${describe(saved)}.` });
      } catch (err) {
        setStatus({ tone: "block", text: `Couldn't undo: ${describeError(err)}` });
      } finally {
        setPending((n) => n - 1);
      }
    });
  }, [history, rows, run, save, onSaved, describe]);

  return {
    onCellValueChanged,
    status,
    saving: pending > 0,
    lastEdit: history[history.length - 1] ?? null,
    undo,
    clearStatus: useCallback(() => setStatus(null), []),
  };
}
