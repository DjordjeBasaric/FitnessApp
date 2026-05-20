"use client";

import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (days: number) => void;
  options?: number[];
};

export function PeriodChips({ value, onChange, options = [7, 14, 30] }: Props) {
  return (
    <div
      className="flex flex-wrap gap-2 rounded-[var(--rounded-lg)] border border-hairline-soft bg-surface p-1"
      role="group"
      aria-label="Vremenski period"
    >
      {options.map((d) => (
        <button
          key={d}
          type="button"
          aria-pressed={value === d}
          onClick={() => onChange(d)}
          className={cn(
            "min-h-11 rounded-[var(--rounded-md)] px-4 py-2 font-label-mono transition-colors duration-150",
            value === d
              ? "bg-mint text-on-primary"
              : "text-charcoal hover:text-link-hover",
          )}
        >
          {d} d
        </button>
      ))}
    </div>
  );
}
