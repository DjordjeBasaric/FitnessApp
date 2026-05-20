"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import type { Locale } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-caption-sm text-mute">{t("common.language")}</span>
      <div
        className="inline-flex rounded-[var(--rounded-md)] border border-hairline-soft bg-surface/60 p-0.5"
        role="group"
        aria-label={t("common.language")}
      >
        {(["sr", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l as Locale)}
            className={cn(
              "rounded-[var(--rounded-sm)] px-2.5 py-1 font-caption-sm transition-colors",
              locale === l
                ? "bg-mint text-on-primary"
                : "text-charcoal hover:text-link-hover",
            )}
          >
            {l === "sr" ? t("common.serbian") : t("common.english")}
          </button>
        ))}
      </div>
    </div>
  );
}
