"use client";
import { cn } from "@/lib/cn";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--ink-soft)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl border border-[var(--hairline-strong)] bg-[var(--card-warm)] px-4 py-3 font-sans text-base text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-all",
            "focus:border-[var(--sienna)] focus:ring-2 focus:ring-[var(--sienna-soft)]",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
