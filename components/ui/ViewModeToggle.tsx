"use client";

import { cn } from "@/lib/utils";

export type ViewMode = "chat" | "manual";

type Props = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export function ViewModeToggle({ mode, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-[var(--rounded-lg)] border border-hairline-soft bg-surface p-1"
      role="group"
      aria-label="Način unosa"
    >
      {(
        [
          ["chat", "Poruka (AI)"],
          ["manual", "Ručno"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          onClick={() => onChange(id)}
          className={cn(
            "min-h-10 rounded-[var(--rounded-md)] px-4 py-2 font-label-mono transition-colors",
            mode === id ? "bg-mint text-on-primary" : "text-charcoal hover:text-link-hover",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
