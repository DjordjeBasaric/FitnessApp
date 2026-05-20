"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { listDailyLogs } from "@/lib/supabase/queries/dailyLogs";
import { listWeightEntries } from "@/lib/supabase/queries/weightEntries";
import { getWeightGoal } from "@/lib/supabase/queries/weightGoals";
import { useAuth } from "@/lib/supabase/AuthContext";
import { isoDateFromLocal } from "@/lib/date";
import {
  filterLogsForPeriod,
  filterWeightsForPeriod,
  getPeriodDateRange,
  type ExportPeriod,
} from "@/lib/export/filterPeriod";
import { downloadFitnessPdf } from "@/lib/export/downloadPdf";
import { resolveBodyWeightKg } from "@/lib/nutrition/bodyWeight";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { exportPeriodKey } from "@/lib/i18n/messages";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const PERIODS: ExportPeriod[] = ["7d", "14d", "30d", "goal", "all"];
const PANEL_W = 288;

type PanelPos = { top: number; left: number };

export function ExportPdfMenu({ className }: Props) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const [period, setPeriod] = useState<ExportPeriod>("14d");
  const [busy, setBusy] = useState(false);
  const [hasGoal, setHasGoal] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - PANEL_W - 16));
    setPanelPos({ top: rect.bottom + 8, left });
  }, []);

  async function checkGoal() {
    if (!user) {
      setHasGoal(false);
      return;
    }
    const g = await getWeightGoal(user.id);
    setHasGoal(g != null);
    if (!g && period === "goal") setPeriod("14d");
  }

  function handleOpen() {
    setOpen((o) => {
      const next = !o;
      if (next) {
        void checkGoal();
        requestAnimationFrame(updatePanelPos);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;
    updatePanelPos();
    const onLayout = () => updatePanelPos();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, updatePanelPos]);

  async function handleExport() {
    if (!user) return;
    setBusy(true);
    try {
      const [logs, weights, weightGoal] = await Promise.all([
        listDailyLogs(user.id),
        listWeightEntries(user.id),
        getWeightGoal(user.id),
      ]);

      if (period === "goal" && !weightGoal) {
        alert(t("export.noGoal"));
        return;
      }

      const filteredLogs = filterLogsForPeriod(logs, period, weightGoal);
      const filteredWeights = filterWeightsForPeriod(weights, period, weightGoal);
      const range = getPeriodDateRange(period, weightGoal);
      const periodLabel = t(exportPeriodKey(period));
      const rangeSuffix =
        range != null ? ` (${range.start} — ${range.end})` : "";
      const endIso = isoDateFromLocal();
      const bodyKg = resolveBodyWeightKg(endIso, weights, weightGoal);

      await downloadFitnessPdf({
        logs: filteredLogs,
        weights: filteredWeights,
        weightGoal,
        periodLabel: periodLabel + rangeSuffix,
        locale,
        bodyKg,
      });
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert(t("export.error"));
    } finally {
      setBusy(false);
    }
  }

  const portal =
    open && mounted && panelPos
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[300] cursor-default bg-black/30"
              aria-label={t("common.cancel")}
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[301] w-[min(18rem,calc(100vw-2rem))] rounded-[var(--rounded-md)] border border-hairline bg-surface p-4 shadow-lg"
              style={{
                left: panelPos.left,
                top: panelPos.top,
                width: PANEL_W,
              }}
              role="dialog"
              aria-label={t("common.export")}
            >
              <p className="font-label-mono text-xs uppercase tracking-wide text-mute">
                {t("export.choosePeriod")}
              </p>
              <div className="mt-3 space-y-2">
                {PERIODS.map((p) => {
                  const disabled = p === "goal" && hasGoal === false;
                  return (
                    <label
                      key={p}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-[var(--rounded-xs)] px-2 py-1.5 text-sm",
                        disabled && "cursor-not-allowed opacity-40",
                        period === p && "bg-mint/10",
                      )}
                    >
                      <input
                        type="radio"
                        name="export-period"
                        value={p}
                        checked={period === p}
                        disabled={disabled}
                        onChange={() => setPeriod(p)}
                        className="accent-mint"
                      />
                      <span>{t(exportPeriodKey(p))}</span>
                    </label>
                  );
                })}
              </div>
              <Button
                type="button"
                className="mt-4 w-full"
                disabled={busy}
                onClick={() => void handleExport()}
              >
                {busy ? t("export.generating") : t("export.downloadPdf")}
              </Button>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={cn("relative z-10 w-full", className)}>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="w-full justify-start gap-3 border-mint text-mint hover:bg-mint hover:text-on-primary"
          aria-label={t("common.exportAria")}
          onClick={handleOpen}
          disabled={busy}
        >
          <Download className="size-5 shrink-0 stroke-[2]" aria-hidden />
          {t("common.export")}
        </Button>
      </div>
      {portal}
    </>
  );
}
