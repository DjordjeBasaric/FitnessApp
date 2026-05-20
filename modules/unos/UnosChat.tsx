"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { dailyLogSchema, type DailyLog } from "@/lib/schemas/dailyLog";
import type { WeightEntry } from "@/lib/schemas/weightEntry";
import type { WeightGoal } from "@/lib/schemas/weightGoal";
import { isoDateFromLocal } from "@/lib/date";
import { dailyIntakeBudgetKcal } from "@/lib/analytics/weightGoal";
import { getDailyLog, upsertDailyLog } from "@/lib/supabase/queries/dailyLogs";
import { useAuth } from "@/lib/supabase/AuthContext";
import {
  clientParseError,
  clientParseLog,
  formatParseApiError,
} from "@/lib/client/parseEntryLog";
import { useJournalChat } from "@/hooks/JournalChatContext";
import { useLocale } from "@/lib/i18n/LocaleContext";

import { DateStripCarousel } from "@/modules/istorija/DateStripCarousel";
import { DayIntakeSummary } from "@/modules/unos/DayIntakeSummary";
import { cn } from "@/lib/utils";

type Props = {
  logs: DailyLog[];
  weights: WeightEntry[];
  refresh: () => void;
  weightGoal: WeightGoal | null;
};

export function UnosChat({ logs, weights, refresh, weightGoal }: Props) {
  const {
    selectedDate,
    setSelectedDate,
    chatLines,
    appendLine,
    ready,
    chatDates,
  } = useJournalChat();
  const { t, locale } = useLocale();
  const { user } = useAuth();

  const stripRows = useMemo(() => {
    const dates = new Set<string>([
      isoDateFromLocal(),
      selectedDate,
      ...chatDates,
      ...logs.map((l) => l.date),
    ]);
    const sorted = [...dates].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const byDate = new Map(logs.map((l) => [l.date, l]));
    return sorted.map(
      (date) =>
        byDate.get(date) ?? {
          date,
          foodItems: [],
          cardioSessions: [],
          strengthBlocks: [],
          updatedAt: 0,
        },
    );
  }, [logs, chatDates, selectedDate]);

  const dailyForSelected = useMemo(
    () => logs.find((l) => l.date === selectedDate),
    [logs, selectedDate],
  );
  const budgetKcal = weightGoal ? dailyIntakeBudgetKcal(weightGoal, selectedDate) : null;

  const [chatInput, setChatInput] = useState("");
  const [parseBusy, setParseBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatLines, parseBusy]);

  async function submitParse() {
    const message = chatInput.trim();
    if (!message || parseBusy) return;
    if (!user) {
      appendLine({ role: "assistant", text: t("unos.error") + " " + "Niste prijavljeni." });
      return;
    }
    setParseBusy(true);
    setChatInput("");
    appendLine({ role: "user", text: message });
    try {
      const history = [...chatLines, { role: "user" as const, text: message }]
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.text,
        }));

      const existing = await getDailyLog(user.id, selectedDate);

      const body: {
        date: string;
        message: string;
        locale: "sr" | "en";
        conversationHistory: { role: "user" | "assistant"; content: string }[];
        dailyBudgetKcal?: number;
        existingDay?: {
          foodItems: DailyLog["foodItems"];
          cardioSessions: DailyLog["cardioSessions"];
          strengthBlocks: DailyLog["strengthBlocks"];
        };
      } = {
        date: selectedDate,
        message,
        locale,
        conversationHistory: history.slice(0, -1),
      };
      if (existing) {
        body.existingDay = {
          foodItems: existing.foodItems,
          cardioSessions: existing.cardioSessions,
          strengthBlocks: existing.strengthBlocks,
        };
      }
      if (budgetKcal != null && budgetKcal > 0) {
        body.dailyBudgetKcal = budgetKcal;
      }

      clientParseLog("šaljem zahtjev", {
        date: body.date,
        messageLen: body.message.length,
        historyCount: body.conversationHistory.length,
        dailyBudgetKcal: body.dailyBudgetKcal,
      });

      const res = await fetch("/api/parse-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Record<string, unknown>;
      clientParseLog("odgovor", { status: res.status, ok: res.ok, data });

      if (!res.ok) {
        throw new Error(formatParseApiError(res.status, data));
      }

      if (data.needsClarification) {
        const q = (data.questions as string[]).join("\n• ");
        appendLine({ role: "assistant", text: `${t("unos.clarification")}\n• ${q}` });
      } else {
        const mergedFromServer = data.mergedLog
          ? dailyLogSchema.safeParse(data.mergedLog)
          : null;
        if (!mergedFromServer || !mergedFromServer.success) {
          throw new Error("Nedostaje mergedLog u odgovoru.");
        }
        await upsertDailyLog(user.id, mergedFromServer.data);
        refresh();
        const reply =
          typeof data.assistantMessage === "string" && data.assistantMessage.trim()
            ? data.assistantMessage.trim()
            : t("unos.updated");
        appendLine({ role: "assistant", text: reply });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Neočekivano";
      clientParseError("submitParse", msg);
      appendLine({
        role: "assistant",
        text: `${t("unos.error")} ${msg}`,
      });
    } finally {
      setParseBusy(false);
      inputRef.current?.focus();
    }
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitParse();
    }
  }

  const hasMessages = chatLines.length > 0;

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-caption-sm text-mute">{t("common.loadingChat")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[420px] flex-col lg:-mx-4 lg:h-[calc(100dvh-6rem)] xl:-mx-8">
      <div className="mb-2 shrink-0">
        <DateStripCarousel
          rows={stripRows}
          activeDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4 lg:max-w-3xl">
          {!hasMessages ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
              <DayIntakeSummary
                log={dailyForSelected}
                budgetKcal={budgetKcal}
                weightGoal={weightGoal}
                weights={weights}
                dateIso={selectedDate}
              />
            </div>
          ) : (
            chatLines.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "text-[17px] leading-relaxed",
                  m.role === "user"
                    ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-[var(--rounded-lg)] bg-mint px-4 py-3 text-[1.0625rem] font-medium text-on-primary"
                    : "mr-auto max-w-[90%] whitespace-pre-wrap text-base text-charcoal",
                )}
              >
                {m.text}
              </div>
            ))
          )}
          {parseBusy ? <p className="mr-auto text-sm text-mute">{t("common.processing")}</p> : null}
        </div>
      </div>

      <div className="shrink-0 bg-canvas pt-3 pb-1 lg:pb-3">
        <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
          <div className="flex items-end gap-2 rounded-[var(--rounded-lg)] border border-hairline bg-surface px-2 py-2 focus-within:border-mint focus-within:ring-1 focus-within:ring-purple">
            <textarea
              ref={inputRef}
              rows={1}
              value={chatInput}
              placeholder={t("unos.messagePlaceholder")}
              disabled={parseBusy}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={onComposerKeyDown}
              className="max-h-40 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-[1.1875rem] leading-relaxed text-ink placeholder:text-mute focus:outline-none focus:ring-0"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              type="button"
              disabled={parseBusy || !chatInput.trim()}
              aria-label={t("unos.sendAria")}
              onClick={() => void submitParse()}
              className={cn(
                "mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-mint",
                "transition-[opacity,filter] enabled:hover:brightness-110",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Send
                className="size-[22px] shrink-0 stroke-black text-black"
                strokeWidth={2.25}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
