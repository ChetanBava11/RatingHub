import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface Base {
  label: string;
  error?: string | null;
  hint?: string;
}

export function Field({
  label,
  error,
  hint,
  children,
}: Base & { children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  error,
  hint,
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        {...props}
        className={
          "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary " +
          (error ? "border-destructive" : "border-input")
        }
      />
    </Field>
  );
}

export function TextArea({
  label,
  error,
  hint,
  ...props
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea
        {...props}
        className={
          "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary " +
          (error ? "border-destructive" : "border-input")
        }
      />
    </Field>
  );
}

export function SelectField({
  label,
  error,
  hint,
  children,
  ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select
        {...props}
        className={
          "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary " +
          (error ? "border-destructive" : "border-input")
        }
      >
        {children}
      </select>
    </Field>
  );
}
