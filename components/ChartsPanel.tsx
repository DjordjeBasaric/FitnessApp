"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DaySeriesPoint } from "@/lib/analytics/series";

const T = {
  grid: "#313131",
  axis: "#ffffff",
  tick: "#949494",
  tooltipBg: "#2d2d2d",
  tooltipBorder: "#ffffff",
  tooltipLabel: "#ffffff",
  legend: "#949494",
  linePrimary: "#3cffd0",
  lineLight: "#5200ff",
  target: "#949494",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | null; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[var(--rounded-sm)] border border-hairline px-3 py-2 text-sm"
      style={{ background: T.tooltipBg }}
    >
      <p className="font-label-mono text-mint">{label}</p>
      <ul className="mt-2 space-y-1 tabular-nums text-charcoal">
        {payload.map((p) =>
          p.value != null ? (
            <li key={String(p.name)} style={{ color: p.color }}>
              {p.name}: <span className="text-ink">{Math.round(p.value)}</span>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

const tooltipProps = {
  content: <ChartTooltip />,
};

export function EnergyBalanceChart({ data }: { data: DaySeriesPoint[] }) {
  const hasData = data.some(
    (d) => d.kcal != null || d.trainingBurnKcal != null || d.budgetKcal != null,
  );
  if (!hasData) {
    return (
      <p className="text-base text-mute">
        Unesi hranu ili trening u Unosu, a cilj postavi u tabu Cilj za liniju trenda.
      </p>
    );
  }

  const merged = data.map((d) => ({
    ...d,
    budgetLine: d.budgetKcal,
  }));

  return (
    <div className="h-80 w-full min-h-[300px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke={T.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: T.tick, fontSize: 13, fontFamily: "ui-monospace" }}
            axisLine={{ stroke: T.axis }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: T.tick, fontSize: 13 }}
            axisLine={{ stroke: T.axis }}
            width={48}
          />
          <Tooltip {...tooltipProps} />
          <Legend
            wrapperStyle={{
              color: T.legend,
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          />
          <Line
            type="monotone"
            dataKey="kcal"
            name="unos hrane"
            stroke={T.linePrimary}
            strokeWidth={2.5}
            connectNulls={false}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="trainingBurnKcal"
            name="trening kcal"
            stroke={T.lineLight}
            strokeWidth={2}
            strokeDasharray="4 4"
            connectNulls={false}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="budgetLine"
            name="linija cilja (max)"
            stroke={T.target}
            strokeWidth={2}
            strokeDasharray="8 4"
            connectNulls
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-3 text-sm text-mute">
        Isprekidana linija = bazni limit iz cilja težine. Trening se dodaje na dnevnu dozvolu hrane u
        prikazu dana (limit + sagorijevanje).
      </p>
    </div>
  );
}

export function WeightLineChart({
  rows,
}: {
  rows: { date: string; kg: number }[];
}) {
  if (!rows.length) {
    return <p className="text-base text-mute">Dodaj težinu u Cilju da pratiš trend.</p>;
  }
  return (
    <div className="h-64 w-full min-h-[240px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke={T.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: T.tick, fontSize: 13 }} axisLine={{ stroke: T.axis }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fill: T.tick, fontSize: 13 }}
            axisLine={{ stroke: T.axis }}
            width={44}
            domain={["dataMin - 0.5", "dataMax + 0.5"]}
            tickFormatter={(v) => `${v} kg`}
          />
          <Tooltip {...tooltipProps} />
          <Legend wrapperStyle={{ color: T.legend, fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="kg"
            stroke={T.linePrimary}
            strokeWidth={2.5}
            dot={{ r: 4 }}
            name="Težina kg"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
