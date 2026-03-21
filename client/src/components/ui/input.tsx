import * as React from "react";
import { cn } from "../../lib/utils.js";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-bg-input px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
