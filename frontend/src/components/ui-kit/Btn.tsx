import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Btn({ variant = "primary", size = "md", className = "", ...props }: Props) {
  const base = "inline-flex items-center justify-center rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "border border-input bg-background text-foreground hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };
  return <button {...props} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} />;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md border border-border bg-card p-5 ${className}`}>{children}</div>;
}
