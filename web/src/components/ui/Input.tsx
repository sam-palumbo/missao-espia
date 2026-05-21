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
          <label htmlFor={id} className="text-xs font-700 text-[var(--stone-mid)] tracking-widest uppercase font-display">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-13 w-full rounded-xl border border-[var(--border)] bg-white px-4 font-body text-base text-[var(--stone)] placeholder:text-[var(--muted)] outline-none transition-all",
            "focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold-light)]/20",
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
