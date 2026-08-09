"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
  placeholder?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  required?: boolean;
}

export default function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  hint,
  autoComplete,
  placeholder,
  leftIcon,
  rightSlot,
  required = true,
}: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-neutral-300">
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
          >
            {leftIcon}
          </span>
        )}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "h-11 w-full rounded-lg border bg-white/[0.05] px-3.5 text-[15px] text-white caret-matte shadow-[0_1px_2px_rgba(0,0,0,0.3)] outline-none transition-all duration-200 placeholder:text-neutral-500 hover:bg-white/[0.07]",
            leftIcon ? "pl-10" : "pl-3.5",
            rightSlot ? "pr-11" : "pr-3.5",
            error
              ? "border-red-400/70 hover:border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/15"
              : "border-white/15 hover:border-white/30 focus:border-matte focus:ring-4 focus:ring-matte/15"
          )}
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {hint && !error && <p className="text-xs leading-relaxed text-neutral-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
