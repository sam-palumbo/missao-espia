"use client";
import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-2xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none",
          {
            primary:   "bg-[var(--ink)] text-[var(--card-warm)] shadow-[0_4px_16px_rgba(42,28,10,0.3)] hover:opacity-90",
            secondary: "bg-[var(--sienna-soft)] text-[var(--sienna)] border border-[var(--sienna)] hover:bg-[var(--sienna)] hover:text-[var(--card-warm)]",
            ghost:     "bg-transparent text-[var(--ink-soft)] hover:bg-[var(--hairline)]",
            danger:    "bg-[var(--brick-soft)] text-[var(--brick)] border border-[var(--brick)] hover:bg-[var(--brick)] hover:text-white",
          }[variant],
          { sm: "h-9 px-4 text-sm", md: "h-12 px-6 text-base", lg: "h-14 px-8 text-lg" }[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
