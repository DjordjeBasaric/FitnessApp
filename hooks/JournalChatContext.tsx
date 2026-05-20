"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isoDateFromLocal } from "@/lib/date";
import type { ChatLine } from "@/hooks/useFitnessState";

const STORAGE_KEY = "journalChat:v3";

export type JournalChatsPersisted = {
  selectedDate: string;
  chatsByDate: Record<string, ChatLine[]>;
};

function sortIsoDatesDesc(dates: Iterable<string>): string[] {
  return [...new Set(dates)].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

function loadFromStorage(): JournalChatsPersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JournalChatsPersisted;
    if (parsed?.selectedDate && parsed.chatsByDate && typeof parsed.chatsByDate === "object") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveToStorage(state: JournalChatsPersisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

type JournalChatContextValue = {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  chatLines: ChatLine[];
  appendLine: (line: ChatLine) => void;
  setChatLines: React.Dispatch<React.SetStateAction<ChatLine[]>>;
  clearChatForDate: (date?: string) => void;
  chatDates: string[];
  ready: boolean;
};

const JournalChatContext = createContext<JournalChatContextValue | null>(null);

export function JournalChatProvider({ children }: { children: ReactNode }) {
  const today = isoDateFromLocal();
  const [selectedDate, setSelectedDateState] = useState(today);
  const [chatsByDate, setChatsByDate] = useState<Record<string, ChatLine[]>>({});
  const [ready, setReady] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      // Hidration iz localStorage — očekivani jednokratni sinhronizacioni korak.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChatsByDate(saved.chatsByDate ?? {});
      const dates = sortIsoDatesDesc([
        today,
        saved.selectedDate,
        ...Object.keys(saved.chatsByDate ?? {}),
      ]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDateState(dates[0] ?? today);
    }
    skipNextSave.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [today]);

  const chatLines = chatsByDate[selectedDate] ?? [];

  const chatDates = useMemo(
    () => sortIsoDatesDesc([today, selectedDate, ...Object.keys(chatsByDate)]),
    [today, selectedDate, chatsByDate],
  );

  useEffect(() => {
    if (!ready || skipNextSave.current) return;
    const t = window.setTimeout(() => {
      saveToStorage({ selectedDate, chatsByDate });
    }, 300);
    return () => window.clearTimeout(t);
  }, [selectedDate, chatsByDate, ready]);

  const setSelectedDate = useCallback((d: string) => {
    setSelectedDateState(d);
  }, []);

  const appendLine = useCallback(
    (line: ChatLine) => {
      setChatsByDate((prev) => ({
        ...prev,
        [selectedDate]: [...(prev[selectedDate] ?? []), line],
      }));
    },
    [selectedDate],
  );

  const setChatLines = useCallback(
    (updater: React.SetStateAction<ChatLine[]>) => {
      setChatsByDate((prev) => {
        const current = prev[selectedDate] ?? [];
        const next = typeof updater === "function" ? updater(current) : updater;
        return { ...prev, [selectedDate]: next };
      });
    },
    [selectedDate],
  );

  const clearChatForDate = useCallback(
    (date?: string) => {
      const d = date ?? selectedDate;
      setChatsByDate((prev) => {
        if (!(d in prev)) return prev;
        const next = { ...prev };
        delete next[d];
        return next;
      });
    },
    [selectedDate],
  );

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      chatLines,
      appendLine,
      setChatLines,
      clearChatForDate,
      chatDates,
      ready,
    }),
    [
      selectedDate,
      setSelectedDate,
      chatLines,
      appendLine,
      setChatLines,
      clearChatForDate,
      chatDates,
      ready,
    ],
  );

  return <JournalChatContext.Provider value={value}>{children}</JournalChatContext.Provider>;
}

export function useJournalChat() {
  const ctx = useContext(JournalChatContext);
  if (!ctx) throw new Error("useJournalChat mora biti unutar JournalChatProvider");
  return ctx;
}
