import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/*
 * Disabled buttons drop their colour, not their contrast: a quiet grey fill with ink-3 text
 * (>= 4.5:1), so the label stays readable and "not available yet" still reads at a glance.
 */
const DISABLED =
  "disabled:border-line disabled:bg-canvas disabled:text-ink-3 disabled:shadow-none disabled:hover:bg-canvas disabled:hover:text-ink-3";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn("bg-accent text-white shadow-sm hover:bg-accent-strong border border-transparent", DISABLED),
  secondary: cn("bg-surface text-ink-2 border border-line-strong shadow-sm hover:bg-canvas hover:text-ink", DISABLED),
  ghost:
    "bg-transparent text-ink-2 border border-transparent hover:bg-ink/5 hover:text-ink disabled:text-ink-3 disabled:hover:bg-transparent",
  danger: cn("bg-surface text-block border border-block-line shadow-sm hover:bg-block-soft", DISABLED),
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-base gap-2 rounded-lg",
};

/** Class names for a button-looking element: shared by Button and ButtonLink. */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string): string {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none",
    "disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, disabled, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(
        variant,
        size,
        // Busy is not "unavailable": a working primary button keeps its colour.
        cn(loading && variant === "primary" && "disabled:border-transparent disabled:bg-accent-strong disabled:text-white", className),
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-3.5" /> : null}
      {children}
    </button>
  );
});
