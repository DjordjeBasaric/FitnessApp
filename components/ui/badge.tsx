import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type NutritionConfidence = "high" | "medium" | "low";

export function NutritionBadge({ level }: { level: NutritionConfidence | string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-[var(--rounded-md)] border border-mint-border bg-canvas px-3 py-1",
        "font-caption-sm text-mint",
      )}
    >
      {level}
    </span>
  );
}

export function BadgePromo({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-[var(--rounded-md)] bg-mint px-3 py-1 font-caption-sm text-on-primary">
      {children}
    </span>
  );
}
