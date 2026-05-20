"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";

import type { ConversationTurn } from "@/lib/chat/conversation";
import type { ChatLine } from "@/hooks/useFitnessState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  emptyState?: ReactNode;
  hints: string[];
  placeholder?: string;
  initialMessages?: ChatLine[];
  onSubmit: (message: string, history: ConversationTurn[]) => Promise<{ assistantLines: string[] }>;
  className?: string;
};

function toTurns(lines: ChatLine[]): ConversationTurn[] {
  return lines
    .filter((l) => l.role === "user" || l.role === "assistant")
    .map((l) => ({
      role: l.role as "user" | "assistant",
      content: l.text,
    }));
}

export function SetupChat({
  emptyState,
  hints,
  placeholder = "Tvoj odgovor…",
  initialMessages = [],
  onSubmit,
  className,
}: Props) {
  const [chatInput, setChatInput] = useState("");
  const [chatLines, setChatLines] = useState<ChatLine[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatLines, busy]);

  async function submit() {
    const t = chatInput.trim();
    if (!t || busy) return;
    const historyBefore = toTurns(chatLines);
    setBusy(true);
    setChatInput("");
    setChatLines((c) => [...c, { role: "user", text: t }]);
    try {
      const { assistantLines } = await onSubmit(t, historyBefore);
      setChatLines((c) => [
        ...c,
        ...assistantLines.map((text) => ({ role: "assistant" as const, text })),
      ]);
    } catch (e) {
      setChatLines((c) => [
        ...c,
        {
          role: "assistant",
          text: "Greška: " + (e instanceof Error ? e.message : "Neočekivano"),
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const hasMessages = chatLines.length > 0;
  const showEmpty = !hasMessages && emptyState;

  return (
    <div
      className={cn(
        "flex min-h-[360px] flex-col rounded-[var(--rounded-md)] border border-hairline-soft bg-canvas",
        className,
      )}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {showEmpty ? emptyState : null}
          {chatLines.map((m, i) => (
            <div
              key={i}
              className={cn(
                "text-base leading-relaxed",
                m.role === "user"
                  ? "ml-auto max-w-[90%] whitespace-pre-wrap rounded-[var(--rounded-lg)] bg-mint px-4 py-3 font-medium text-on-primary"
                  : "mr-auto max-w-[95%] whitespace-pre-wrap text-charcoal",
              )}
            >
              {m.text}
            </div>
          ))}
          {busy ? <p className="text-sm text-mute">Obrada…</p> : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-hairline-soft p-3">
        <div className="flex items-end gap-2 rounded-[var(--rounded-lg)] border border-hairline bg-surface px-2 py-2 focus-within:border-mint focus-within:ring-1 focus-within:ring-purple">
          <textarea
            ref={inputRef}
            rows={1}
            value={chatInput}
            placeholder={placeholder}
            disabled={busy}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="max-h-36 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-base leading-relaxed text-ink placeholder:text-mute focus:outline-none"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button
            type="button"
            size="icon"
            disabled={busy || !chatInput.trim()}
            aria-label="Pošalji"
            className="mb-0.5 size-11 shrink-0 rounded-full disabled:opacity-30"
            onClick={() => void submit()}
          >
            <ArrowUp className="size-5" strokeWidth={2} />
          </Button>
        </div>
        <ul className="mt-2 space-y-1 font-caption-sm text-mute">
          {hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
