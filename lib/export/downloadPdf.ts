import { isoDateFromLocal } from "@/lib/date";
import { sumFoodTotals } from "@/hooks/useFitnessState";
import {
  activityLabelKey,
  mealLabelKey,
  translate,
  type Locale,
} from "@/lib/i18n/messages";
import { groupFoodByMeal, MEAL_SLOTS } from "@/lib/nutrition/meals";
import { sumTrainingBurnKcal } from "@/lib/nutrition/trainingBurn";
import type { DailyLog } from "@/lib/schemas/dailyLog";
import type { WeightEntry } from "@/lib/schemas/weightEntry";
import type { WeightGoal } from "@/lib/schemas/weightGoal";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

function formatLongDateLocale(iso: string, locale: Locale): string {
  const [yy, mm, dd] = iso.split("-").map(Number);
  const d = new Date(yy, mm - 1, dd);
  const intl = locale === "en" ? "en-US" : "sr-Latn";
  return new Intl.DateTimeFormat(intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function t(locale: Locale, key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) {
  return translate(locale, key, vars);
}

function buildDaySection(log: DailyLog, locale: Locale, bodyKg: number): Content[] {
  const blocks: Content[] = [
    {
      text: formatLongDateLocale(log.date, locale),
      style: "dayTitle",
      margin: [0, 14, 0, 6],
    },
  ];

  const groups = groupFoodByMeal(log.foodItems);
  for (const slot of MEAL_SLOTS) {
    const group = groups.find((g) => g.slot === slot);
    if (!group?.items.length) continue;
    blocks.push({
      text: t(locale, mealLabelKey(slot)),
      style: "mealHeader",
      margin: [0, 4, 0, 2],
    });
    blocks.push({
      table: {
        widths: ["*", 40, 32, 32, 32],
        body: [
          [
            t(locale, "export.col.item"),
            t(locale, "export.col.kcal"),
            "P",
            "UH",
            "M",
          ],
          ...group.items.map((f) => [
            f.description,
            String(Math.round(f.kcal)),
            String(Math.round(f.proteinG)),
            String(Math.round(f.carbsG)),
            String(Math.round(f.fatG)),
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 6],
    });
  }

  if (log.cardioSessions.length) {
    blocks.push({ text: t(locale, "history.cardio"), style: "mealHeader", margin: [0, 2, 0, 2] });
    for (const c of log.cardioSessions) {
      const parts = [c.kind];
      if (c.minutes != null) parts.push(`${c.minutes} min`);
      if (c.distanceKm != null) parts.push(`${c.distanceKm} km`);
      if (c.estimatedKcalBurned != null) parts.push(`~${Math.round(c.estimatedKcalBurned)} kcal`);
      blocks.push({ text: `• ${parts.join(" · ")}`, margin: [0, 0, 0, 2] });
    }
  }

  if (log.strengthBlocks.length) {
    blocks.push({ text: t(locale, "history.strength"), style: "mealHeader", margin: [0, 2, 0, 2] });
    for (const s of log.strengthBlocks) {
      blocks.push({
        text: `• ${s.muscleGroup}: ${s.details}${s.estimatedKcalBurned != null ? ` (~${Math.round(s.estimatedKcalBurned)} kcal)` : ""}`,
        margin: [0, 0, 0, 2],
      });
    }
  }

  const totals = sumFoodTotals(log);
  const burn = sumTrainingBurnKcal(log, bodyKg);
  blocks.push({
    text: `${t(locale, "export.dayTotal")}: ${Math.round(totals.kcal)} kcal · P ${Math.round(totals.proteinG)} · UH ${Math.round(totals.carbsG)} · M ${Math.round(totals.fatG)}${burn > 0 ? ` · ${t(locale, "export.training")} ~${burn} kcal` : ""}`,
    style: "dayTotal",
    margin: [0, 4, 0, 0],
  });

  return blocks;
}

function buildDocument(opts: {
  logs: DailyLog[];
  weights: WeightEntry[];
  weightGoal: WeightGoal | null;
  periodLabel: string;
  locale: Locale;
  bodyKg: number;
}): TDocumentDefinitions {
  const { logs, weights, weightGoal, periodLabel, locale, bodyKg } = opts;
  const content: Content[] = [
    { text: "FAIT", style: "title" },
    { text: t(locale, "export.reportTitle"), style: "subtitle", margin: [0, 0, 0, 8] },
    {
      text: `${t(locale, "export.period")}: ${periodLabel}`,
      margin: [0, 0, 0, 2],
    },
    {
      text: `${t(locale, "export.generated")}: ${formatLongDateLocale(isoDateFromLocal(), locale)}`,
      margin: [0, 0, 0, 10],
    },
  ];

  if (weightGoal) {
    content.push({
      text: [
        { text: `${t(locale, "export.goal")}: `, bold: true },
        `${weightGoal.startKg} kg → ${weightGoal.targetKg} kg (${weightGoal.startDate} — ${weightGoal.endDate})`,
      ],
      margin: [0, 0, 0, 10],
    });
  }

  if (!logs.length) {
    content.push({ text: t(locale, "export.noData"), italics: true, margin: [0, 8, 0, 0] });
  } else {
    for (const log of logs) {
      content.push(...buildDaySection(log, locale, bodyKg));
    }
  }

  if (weights.length) {
    content.push({
      text: t(locale, "goal.weightLog"),
      style: "dayTitle",
      margin: [0, 16, 0, 6],
    });
    content.push({
      table: {
        widths: ["*", 60],
        body: [
          [t(locale, "common.date"), "kg"],
          ...weights.map((w) => [w.date, String(w.kg)]),
        ],
      },
      layout: "lightHorizontalLines",
    });
  }

  content.push({
    text: t(locale, "disclaimer.mobile"),
    style: "footer",
    margin: [0, 20, 0, 0],
  });

  return {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 48],
    defaultStyle: { font: "Roboto", fontSize: 10 },
    styles: {
      title: { fontSize: 22, bold: true, color: "#1a1a1a" },
      subtitle: { fontSize: 14, bold: true },
      dayTitle: { fontSize: 12, bold: true, color: "#2d6a4f" },
      mealHeader: { fontSize: 10, bold: true },
      dayTotal: { fontSize: 9, color: "#444" },
      footer: { fontSize: 8, color: "#666", italics: true },
    },
    content,
  };
}

export async function downloadFitnessPdf(opts: {
  logs: DailyLog[];
  weights: WeightEntry[];
  weightGoal: WeightGoal | null;
  periodLabel: string;
  locale: Locale;
  bodyKg?: number;
}): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfMake = pdfMakeModule.default;
  const fonts = pdfFontsModule as { pdfMake?: { vfs: unknown }; default?: unknown };
  const vfs = fonts.pdfMake?.vfs ?? fonts.default;
  if (vfs && typeof vfs === "object") {
    (pdfMake as unknown as { vfs: Record<string, string> }).vfs = vfs as Record<
      string,
      string
    >;
  }

  const doc = buildDocument({ ...opts, bodyKg: opts.bodyKg ?? 75 });
  const filename = `fait-dnevnik-${isoDateFromLocal()}.pdf`;
  pdfMake.createPdf(doc).download(filename);
}
