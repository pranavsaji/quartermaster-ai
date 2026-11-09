import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { currencySymbol } from "@/lib/format";
import { cn } from "./cn";

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink shadow-xs placeholder:text-ink-4 " +
  "transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 " +
  "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-3 aria-[invalid=true]:border-block";

/** Props a Field hands its control: spread them onto the input (`<Input {...control} />`). */
export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
}

/**
 * Label + control + hint/error wrapper. The render prop receives the control's
 * id and ARIA wiring, which only ever references text that is on screen.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const control: FieldControlProps = {
    id,
    "aria-describedby": [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-required": required ? true : undefined,
  };
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-block">
            *
          </span>
        ) : null}
      </label>
      {children(control)}
      {hint ? (
        <p id={hintId} className="text-[12px] text-ink-3">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[12px] font-medium text-block">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, "h-9", className)} {...rest} />;
});

/** Text input with a leading currency-symbol adornment for money entry. */
export const MoneyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { currency: string }>(function MoneyInput(
  { className, currency, ...rest },
  ref,
) {
  const symbol = currencySymbol(currency);
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-3">
        {symbol}
      </span>
      <input ref={ref} inputMode="decimal" className={cn(control, "tnum h-9", symbol.length > 1 ? "pl-12" : "pl-6", className)} {...rest} />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn(control, "h-9 pr-8", className)} {...rest}>
      {children}
    </select>
  );
});

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-[var(--color-accent)] disabled:cursor-not-allowed"
        aria-describedby={description ? `${id}-desc` : undefined}
        {...rest}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2 select-none">
          {label}
        </label>
        {description ? (
          <p id={`${id}-desc`} className="text-[12px] text-ink-3">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
