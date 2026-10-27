import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type VarianteAlerta = "info" | "success" | "warning" | "error";

const variantes: Record<VarianteAlerta, string> = {
  info: "border-blue-200 bg-secondary text-secondary-foreground",
  success: "border-green-200 bg-success-background text-success",
  warning: "border-amber-200 bg-warning-background text-warning",
  error: "border-red-200 bg-destructive-background text-destructive",
};

export function Alert({
  className,
  variant = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: VarianteAlerta }) {
  return (
    <div
      role={variant === "error" ? "alert" : undefined}
      className={cn("rounded-[var(--radius)] border p-4 text-sm", variantes[variant], className)}
      {...props}
    />
  );
}
