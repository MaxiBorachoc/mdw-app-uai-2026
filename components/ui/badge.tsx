import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type VarianteBadge = "blue" | "neutral" | "success" | "warning" | "danger";

const variantes: Record<VarianteBadge, string> = {
  blue: "bg-secondary text-secondary-foreground",
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-background text-success",
  warning: "bg-warning-background text-warning",
  danger: "bg-destructive-background text-destructive",
};

export function Badge({
  className,
  variant = "blue",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: VarianteBadge }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variantes[variant],
        className,
      )}
      {...props}
    />
  );
}
