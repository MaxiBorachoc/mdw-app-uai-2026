import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type VarianteBoton = "primary" | "secondary" | "outline" | "ghost" | "danger";
type TamanoBoton = "sm" | "md";

const variantes: Record<VarianteBoton, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-blue-700",
  secondary: "bg-secondary text-secondary-foreground hover:bg-blue-100",
  outline: "border bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-destructive text-white hover:bg-red-800",
};

const tamanos: Record<TamanoBoton, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: VarianteBoton;
  size?: TamanoBoton;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    variantes[variant],
    tamanos[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: VarianteBoton;
  size?: TamanoBoton;
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return <button className={buttonStyles({ variant, size, className })} {...props} />;
}
