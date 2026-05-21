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
          "inline-flex items-center justify-center gap-2 font-body font-700 rounded-2xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none",
          {
            "primary": "bg-[var(--stone)] text-white shadow-[0_4px_16px_rgba(28,25,23,0.25)] hover:bg-[var(--stone-mid)]",
            "secondary": "bg-[var(--gold-bg)] text-[var(--gold)] border border-[var(--gold-light)] hover:bg-[var(--gold)] hover:text-white",
            "ghost": "bg-transparent text-[var(--stone-mid)] hover:bg-[var(--border)]",
            "danger": "bg-[var(--crimson-bg)] text-[var(--crimson)] border border-[var(--crimson)] hover:bg-[var(--crimson)] hover:text-white",
          }[variant],
          {
            "sm": "h-9 px-4 text-sm",
            "md": "h-12 px-6 text-base",
            "lg": "h-14 px-8 text-lg",
          }[size],
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
