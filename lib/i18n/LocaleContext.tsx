"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LOCALE_STORAGE_KEY,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n/messages";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  ready: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocale(): Locale {
  if (typeof window === "undefined") return "sr";
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === "en" || raw === "sr") return raw;
  } catch {
    /* ignore */
  }
  return "sr";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("sr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hidration iz localStorage — sinhroni setState je očekivan jednokratan
    // korak. (react-hooks/set-state-in-effect je previše striktan ovde.)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(readLocale());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "en" ? "en" : "sr";
    }
  }, []);

  useEffect(() => {
    if (ready) {
      document.documentElement.lang = locale === "en" ? "en" : "sr";
    }
  }, [locale, ready]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, ready }),
    [locale, setLocale, t, ready],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale mora biti unutar LocaleProvider");
  return ctx;
}
