import type { InputHTMLAttributes } from "react";
import { useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-strong">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-control border border-border-soft bg-card px-3.5 py-2.5 text-sm text-strong placeholder:text-muted focus:border-primary focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
