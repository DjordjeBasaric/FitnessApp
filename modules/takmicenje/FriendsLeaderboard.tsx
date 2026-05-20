"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { addDaysToIso, isoDateFromLocal } from "@/lib/date";
import { useAuth } from "@/lib/supabase/AuthContext";
import { getFriendsLeaderboard } from "@/lib/supabase/queries/scores";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RangeKey = "week" | "month";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "week", label: "Sedmica", days: 7 },
  { key: "month", label: "Mjesec", days: 30 },
];

export function FriendsLeaderboard() {
  const { user } = useAuth();
  const [range, setRange] = useState<RangeKey>("week");
  const userId = user?.id;

  const today = isoDateFromLocal();
  const days = RANGES.find((r) => r.key === range)?.days ?? 7;
  const startDate = addDaysToIso(today, -(days - 1));
  const prevStart = addDaysToIso(startDate, -days);
  const prevEnd = addDaysToIso(startDate, -1);

  const currentQ = useQuery({
    queryKey: ["leaderboard", userId, range, "current", startDate, today],
    queryFn: () => getFriendsLeaderboard(userId!, startDate, today),
    enabled: !!userId,
  });
  const prevQ = useQuery({
    queryKey: ["leaderboard", userId, range, "prev", prevStart, prevEnd],
    queryFn: () => getFriendsLeaderboard(userId!, prevStart, prevEnd),
    enabled: !!userId,
  });

  const prevByUser = new Map((prevQ.data ?? []).map((e) => [e.userId, e.totalPoints]));

  const entries = currentQ.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabela prijatelja</CardTitle>
        <CardDescription>
          Suma poena (preciznost + zdravlje) u izabranom periodu.
        </CardDescription>
        <div className="mt-3 flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              type="button"
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {currentQ.isLoading ? (
          <p className="text-sm text-mute">Učitavam…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-mute">
            Još nema poena u ovom periodu — pošalji zahtjev prijateljima u sekciji Prijatelji.
          </p>
        ) : (
          <ol className="space-y-2">
            {entries.map((e, i) => {
              const prev = prevByUser.get(e.userId) ?? 0;
              const diff = e.totalPoints - prev;
              const isMe = e.userId === userId;
              return (
                <li
                  key={e.userId}
                  className={`flex items-center gap-3 rounded-[var(--rounded-md)] border border-hairline px-3 py-2 ${
                    isMe ? "bg-mint/10" : ""
                  }`}
                >
                  <span className="font-display-sm w-8 text-center tabular-nums text-mute">
                    {i + 1}
                  </span>
                  {e.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- OAuth avatari sa raznih domena; ne želimo next.config remote patterns za MVP
                    <img
                      src={e.avatarUrl}
                      alt=""
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid size-8 place-items-center rounded-full bg-mute/20 font-caption-sm text-mute">
                      {(e.username[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {e.displayName ?? e.username}
                      {isMe ? <span className="ml-2 text-mute">(ti)</span> : null}
                    </p>
                    <p className="truncate font-caption-sm text-mute">
                      @{e.username} · {e.daysCounted} dana · strik {e.currentStreak}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display-sm tabular-nums text-mint">
                      {e.totalPoints}
                    </p>
                    <TrendIndicator diff={diff} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ diff }: { diff: number }) {
  if (diff === 0) {
    return (
      <span className="font-caption-sm inline-flex items-center gap-1 text-mute">
        <Minus className="size-3" aria-hidden /> 0
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="font-caption-sm inline-flex items-center gap-1 text-mint">
        <ArrowUp className="size-3" aria-hidden />+{diff}
      </span>
    );
  }
  return (
    <span className="font-caption-sm inline-flex items-center gap-1 text-coral">
      <ArrowDown className="size-3" aria-hidden />
      {diff}
    </span>
  );
}
