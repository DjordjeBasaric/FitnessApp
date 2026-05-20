"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { cn } from "@/lib/utils";

export function DisclaimerFooter({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "mobile";
}) {
  const { t } = useLocale();

  if (variant === "mobile") {
    return (
      <footer
        className={cn(
          "border-t border-hairline-soft bg-surface px-3 py-1.5 pb-[calc(3.25rem+env(safe-area-inset-bottom))]",
          "text-[10px] leading-relaxed text-mute lg:text-xs",
          className,
        )}
      >
        <p>{t("disclaimer.mobile")}</p>
      </footer>
    );
  }

  return (
    <footer className={cn("border-t border-hairline-soft bg-canvas px-4 py-8", className)}>
      <div className="mx-auto max-w-[var(--max-content)]">
        <p className="font-caption-sm leading-relaxed text-mute">{t("disclaimer.desktop")}</p>
        <p className="font-caption-sm mt-4 text-stone">
          © {new Date().getFullYear()}{" "}
          <span className="text-ink">
            F<span className="text-mint">AI</span>T
          </span>
        </p>
      </div>
    </footer>
  );
}
