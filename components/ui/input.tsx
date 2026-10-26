import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-sm text-foreground",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
