"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { DailyLog } from "@/lib/schemas/dailyLog";
import { formatShortDate } from "@/lib/date";
import { sumFoodTotals } from "@/hooks/useFitnessState";
import { useLocale } from "@/lib/i18n/LocaleContext";
import type { Locale } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

function stripSegmentLabel(iso: string, locale: Locale): { dow: string; dom: string; month: string } {
  const [yy, mm, dd] = iso.split("-").map(Number);
  const d = new Date(yy, mm - 1, dd);
  const intl = locale === "en" ? "en-US" : "sr-Latn";
  const dow = new Intl.DateTimeFormat(intl, { weekday: "short" }).format(d).replace(".", "");
  const month = new Intl.DateTimeFormat(intl, { month: "short" }).format(d).replace(".", "");
  return { dow: dow.slice(0, 3).toUpperCase(), dom: `${dd}`, month };
}

type Props = {
  rows: DailyLog[];
  activeDate: string | undefined;
  onSelect: (date: string) => void;
  onSpinDirection?: (dir: 1 | -1) => void;
};

export function DateStripCarousel({ rows, activeDate, onSelect, onSpinDirection }: Props) {
  const { t, locale } = useLocale();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevIndexRef = useRef(0);

  const activeIndex = Math.max(
    0,
    rows.findIndex((r) => r.date === activeDate),
  );
  const [translateX, setTranslateX] = useState(0);

  const recenter = () => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const item = itemRefs.current[activeIndex];
    const sample = itemRefs.current[0];
    if (!viewport || !track || !item || !sample) return;

    const edgePad = viewport.clientWidth / 2 - sample.offsetWidth / 2;
    track.style.paddingLeft = `${edgePad}px`;
    track.style.paddingRight = `${edgePad}px`;

    const viewportCenter = viewport.clientWidth / 2;
    const itemCenter = item.offsetLeft + item.offsetWidth / 2;
    setTranslateX(viewportCenter - itemCenter);
  };

  useLayoutEffect(() => {
    if (activeIndex !== prevIndexRef.current) {
      const dir = activeIndex > prevIndexRef.current ? 1 : -1;
      onSpinDirection?.(dir);
      prevIndexRef.current = activeIndex;
    }
    recenter();
  }, [activeIndex, rows.length]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(() => recenter());
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [activeIndex, rows.length]);

  if (!rows.length) return null;

  return (
    <div
      ref={viewportRef}
      className="date-strip-viewport mx-auto w-full max-w-5xl px-2 py-3"
      role="list"
      aria-label={t("history.dayPicker")}
    >
      <div
        ref={trackRef}
        className="date-strip-track flex items-end gap-3 sm:gap-4"
        style={{ transform: `translate3d(${translateX}px, 0, 0)` }}
      >
        {rows.map((log, i) => {
          const { dow, dom, month } = stripSegmentLabel(log.date, locale);
          const isSel = activeDate === log.date;
          const offset = i - activeIndex;
          const kcal = log.foodItems.length ? Math.round(sumFoodTotals(log).kcal) : null;
          const abs = Math.abs(offset);
          const scale = isSel ? 1 : Math.max(0.86, 1 - abs * 0.05);
          const opacity = isSel ? 1 : Math.max(0.5, 0.92 - abs * 0.12);
          const lift = isSel ? 0 : 4 + abs * 2;

          return (
            <button
              key={log.date}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="listitem"
              aria-pressed={isSel}
              aria-label={formatShortDate(log.date)}
              onClick={() => onSelect(log.date)}
              className={cn(
                "date-strip-item flex shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--rounded-lg)] border px-3 py-3 sm:px-4",
                "min-h-[5.25rem] min-w-[5rem] sm:min-h-[6rem] sm:min-w-[5.75rem]",
                isSel
                  ? "date-strip-item--active border-mint bg-mint text-on-primary"
                  : "border-hairline bg-surface text-ink hover:border-mint-border",
              )}
              style={{
                transform: `translate3d(0, ${lift}px, 0) scale(${scale})`,
                opacity,
                zIndex: 20 - abs,
              }}
            >
              <span className="font-label-mono text-[11px] tracking-wide sm:text-xs">{dow}</span>
              <span className="text-2xl font-semibold tabular-nums leading-none sm:text-3xl">{dom}</span>
              <span
                className={cn(
                  "text-[11px] capitalize sm:text-xs",
                  isSel ? "text-on-primary/75" : "text-mute",
                )}
              >
                {month}
              </span>
              {kcal != null ? (
                <span
                  className={cn(
                    "mt-0.5 text-sm font-medium tabular-nums sm:text-base",
                    isSel ? "text-on-primary/90" : "text-mint",
                  )}
                >
                  {kcal}
                </span>
              ) : (
                <span className={cn("mt-0.5 text-xs", isSel ? "text-on-primary/60" : "text-stone")}>
                  —
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
