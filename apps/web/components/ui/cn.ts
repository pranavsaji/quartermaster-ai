import { twMerge } from "tailwind-merge";

/**
 * Joins class names, skipping falsy values, and resolves Tailwind conflicts so
 * a later class wins (`cn("min-h-24", "min-h-14")` → `"min-h-14"`). Without the
 * merge both classes would ship and whichever the stylesheet emits last would
 * win, regardless of the caller's intent.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
