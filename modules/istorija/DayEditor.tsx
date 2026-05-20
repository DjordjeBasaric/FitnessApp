"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DailyLog, FoodItem, MealSlot } from "@/lib/schemas/dailyLog";
import {
  emptyCardioSession,
  emptyFoodItem,
  emptyStrengthBlock,
  normalizeDailyLog,
} from "@/lib/dailyLog/helpers";
import { upsertDailyLog } from "@/lib/supabase/queries/dailyLogs";
import { useAuth } from "@/lib/supabase/AuthContext";
import { mealLabelKey, type MessageKey } from "@/lib/i18n/messages";

type TFunc = (key: MessageKey, vars?: Record<string, string | number>) => string;
import { useLocale } from "@/lib/i18n/LocaleContext";
import { MEAL_SLOTS, resolveMealSlot } from "@/lib/nutrition/meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  log: DailyLog;
  onSaved: () => void;
  onCancel: () => void;
  onDeleteDay: () => void | Promise<void>;
};

function parseNum(v: string, fallback = 0): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : fallback;
}

function parseOptionalNum(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const fieldClass = "min-h-9 text-base";
const selectClass = cn(
  fieldClass,
  "w-full rounded-[var(--rounded-xs)] border border-hairline bg-canvas px-3 py-2 text-ink",
  "focus:border-mint focus:outline-none focus:ring-1 focus:ring-purple",
);

export function DayEditor({ log, onSaved, onCancel, onDeleteDay }: Props) {
  const { t } = useLocale();
  const { user } = useAuth();
  const [draft, setDraft] = useState<DailyLog>(() => structuredClone(log));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const foodBySlot = useMemo(() => {
    const map: Record<MealSlot, FoodItem[]> = {
      dorucak: [],
      rucak: [],
      vecera: [],
      uzina: [],
    };
    for (const f of draft.foodItems) {
      map[resolveMealSlot(f)].push(f);
    }
    return map;
  }, [draft.foodItems]);

  function updateFood(id: string, patch: Partial<FoodItem>) {
    setDraft((d) => ({
      ...d,
      foodItems: d.foodItems.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }

  function removeFood(id: string) {
    setDraft((d) => ({ ...d, foodItems: d.foodItems.filter((f) => f.id !== id) }));
  }

  function addFood(slot: MealSlot) {
    setDraft((d) => ({
      ...d,
      foodItems: [...d.foodItems, emptyFoodItem(slot)],
    }));
  }

  function updateCardio(id: string, patch: Partial<DailyLog["cardioSessions"][0]>) {
    setDraft((d) => ({
      ...d,
      cardioSessions: d.cardioSessions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function removeCardio(id: string) {
    setDraft((d) => ({
      ...d,
      cardioSessions: d.cardioSessions.filter((c) => c.id !== id),
    }));
  }

  function updateStrength(id: string, patch: Partial<DailyLog["strengthBlocks"][0]>) {
    setDraft((d) => ({
      ...d,
      strengthBlocks: d.strengthBlocks.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function removeStrength(id: string) {
    setDraft((d) => ({
      ...d,
      strengthBlocks: d.strengthBlocks.filter((s) => s.id !== id),
    }));
  }

  async function handleSave() {
    if (!user) {
      setError("Niste prijavljeni.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const normalized = normalizeDailyLog(draft);
      await upsertDailyLog(user.id, normalized);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editor.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDay() {
    if (
      !window.confirm(t("editor.deleteDayConfirm", { date: log.date }))
    ) {
      return;
    }
    setBusy(true);
    try {
      await onDeleteDay();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-label-mono text-mute">
          {t("editor.editing")} · {log.date}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleSave()}>
            {t("common.save")}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="day-note">{t("editor.dayNote")}</Label>
        <Textarea
          id="day-note"
          rows={2}
          value={draft.dayNote ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              dayNote: e.target.value.trim() ? e.target.value : undefined,
            }))
          }
          placeholder="Opciono…"
          className="text-base"
        />
      </div>

      <section className="space-y-6">
        <h3 className="text-base font-medium text-ink">{t("editor.foodSection")}</h3>
        {MEAL_SLOTS.map((slot) => (
          <div
            key={slot}
            className="rounded-[var(--rounded-md)] border border-hairline bg-surface/50 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h4 className="font-label-mono text-sm uppercase tracking-wide text-ink">
                {t(mealLabelKey(slot))}
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addFood(slot)}
              >
                <Plus className="size-4" aria-hidden />
                {t("editor.addItem")}
              </Button>
            </div>
            {!foodBySlot[slot].length ? (
              <p className="text-sm text-mute">{t("history.noFood")}</p>
            ) : (
              <div className="space-y-4">
                {foodBySlot[slot].map((f) => (
                  <FoodItemForm
                    key={f.id}
                    item={f}
                    onChange={(patch) => updateFood(f.id, patch)}
                    onRemove={() => removeFood(f.id)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-medium text-ink">{t("history.cardio")}</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                cardioSessions: [...d.cardioSessions, emptyCardioSession()],
              }))
            }
          >
            <Plus className="size-4" aria-hidden />
            {t("editor.addCardio")}
          </Button>
        </div>
        {!draft.cardioSessions.length ? (
          <p className="text-sm text-mute">{t("history.noCardio")}</p>
        ) : (
          draft.cardioSessions.map((c) => (
            <CardioForm
              key={c.id}
              session={c}
              onChange={(patch) => updateCardio(c.id, patch)}
              onRemove={() => removeCardio(c.id)}
              t={t}
            />
          ))
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-medium text-ink">{t("history.strength")}</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                strengthBlocks: [...d.strengthBlocks, emptyStrengthBlock()],
              }))
            }
          >
            <Plus className="size-4" aria-hidden />
            {t("editor.addStrength")}
          </Button>
        </div>
        {!draft.strengthBlocks.length ? (
          <p className="text-sm text-mute">{t("history.noStrength")}</p>
        ) : (
          draft.strengthBlocks.map((s) => (
            <StrengthForm
              key={s.id}
              block={s}
              onChange={(patch) => updateStrength(s.id, patch)}
              onRemove={() => removeStrength(s.id)}
              t={t}
            />
          ))
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          className="text-red-700 hover:text-red-800"
          onClick={() => void handleDeleteDay()}
        >
          {t("editor.deleteWholeDay")}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleSave()}>
            {t("editor.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FoodItemForm({
  item,
  onChange,
  onRemove,
  t,
}: {
  item: FoodItem;
  onChange: (patch: Partial<FoodItem>) => void;
  onRemove: () => void;
  t: TFunc;
}) {
  return (
    <div className="space-y-3 rounded-[var(--rounded-xs)] border border-hairline-soft bg-canvas p-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
            <div>
              <Label className="text-xs text-mute">{t("editor.desc")}</Label>
              <Input
                className={fieldClass}
                value={item.description}
                onChange={(e) => onChange({ description: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-mute">{t("meal.slot")}</Label>
              <select
                className={selectClass}
                value={item.mealSlot ?? resolveMealSlot(item)}
                onChange={(e) =>
                  onChange({ mealSlot: e.target.value as MealSlot })
                }
              >
                {MEAL_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {t(mealLabelKey(s))}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <NumField label="kcal" value={item.kcal} onChange={(v) => onChange({ kcal: parseNum(v) })} />
            <NumField
              label="P (g)"
              value={item.proteinG}
              onChange={(v) => onChange({ proteinG: parseNum(v) })}
            />
            <NumField
              label="UH (g)"
              value={item.carbsG}
              onChange={(v) => onChange({ carbsG: parseNum(v) })}
            />
            <NumField
              label="M (g)"
              value={item.fatG}
              onChange={(v) => onChange({ fatG: parseNum(v) })}
            />
            <NumField
              label={t("editor.fiber")}
              value={item.fiberG ?? ""}
              optional
              onChange={(v) => onChange({ fiberG: parseOptionalNum(v) })}
            />
            <NumField
              label={t("editor.sodium")}
              value={item.sodiumMg ?? ""}
              optional
              onChange={(v) => onChange({ sodiumMg: parseOptionalNum(v) })}
            />
            <div>
              <Label className="text-xs text-mute">{t("editor.confidence")}</Label>
              <select
                className={selectClass}
                value={item.nutritionConfidence}
                onChange={(e) =>
                  onChange({
                    nutritionConfidence: e.target.value as FoodItem["nutritionConfidence"],
                  })
                }
              >
                <option value="high">{t("editor.conf.high")}</option>
                <option value="medium">{t("editor.conf.medium")}</option>
                <option value="low">{t("editor.conf.low")}</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-mute">{t("editor.note")}</Label>
            <Input
              className={fieldClass}
              value={item.nutritionNote ?? ""}
              onChange={(e) =>
                onChange({ nutritionNote: e.target.value.trim() || undefined })
              }
            />
          </div>
        </div>
        <button
          type="button"
          aria-label={t("editor.deleteItem")}
          onClick={onRemove}
          className="mt-6 flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline text-mute hover:border-red-300 hover:text-red-600"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function CardioForm({
  session,
  onChange,
  onRemove,
  t,
}: {
  session: DailyLog["cardioSessions"][0];
  onChange: (patch: Partial<DailyLog["cardioSessions"][0]>) => void;
  onRemove: () => void;
  t: TFunc;
}) {
  return (
    <div className="flex gap-2 rounded-[var(--rounded-xs)] border border-hairline-soft bg-canvas p-3">
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2">
          <Label className="text-xs text-mute">{t("editor.kind")}</Label>
          <Input
            className={fieldClass}
            value={session.kind}
            onChange={(e) => onChange({ kind: e.target.value })}
          />
        </div>
        <NumField
          label="Min"
          value={session.minutes ?? ""}
          optional
          onChange={(v) => onChange({ minutes: parseOptionalNum(v) })}
        />
        <NumField
          label="km"
          value={session.distanceKm ?? ""}
          optional
          onChange={(v) => onChange({ distanceKm: parseOptionalNum(v) })}
        />
        <div>
          <Label className="text-xs text-mute">{t("editor.intensity")}</Label>
          <Input
            className={fieldClass}
            value={session.intensity ?? ""}
            onChange={(e) => onChange({ intensity: e.target.value.trim() || undefined })}
          />
        </div>
        <NumField
          label="kcal"
          value={session.estimatedKcalBurned ?? ""}
          optional
          onChange={(v) => onChange({ estimatedKcalBurned: parseOptionalNum(v) })}
        />
      </div>
      <DeleteIconButton onClick={onRemove} label={t("common.delete")} />
    </div>
  );
}

function StrengthForm({
  block,
  onChange,
  onRemove,
  t,
}: {
  block: DailyLog["strengthBlocks"][0];
  onChange: (patch: Partial<DailyLog["strengthBlocks"][0]>) => void;
  onRemove: () => void;
  t: TFunc;
}) {
  return (
    <div className="flex gap-2 rounded-[var(--rounded-xs)] border border-hairline-soft bg-canvas p-3">
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <Label className="text-xs text-mute">{t("editor.muscleGroup")}</Label>
          <Input
            className={fieldClass}
            value={block.muscleGroup}
            onChange={(e) => onChange({ muscleGroup: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-mute">{t("editor.details")}</Label>
          <Textarea
            rows={3}
            className="text-base"
            value={block.details}
            onChange={(e) => onChange({ details: e.target.value })}
          />
        </div>
        <NumField
          label={t("editor.kcalEstimate")}
          value={block.estimatedKcalBurned ?? ""}
          optional
          onChange={(v) => onChange({ estimatedKcalBurned: parseOptionalNum(v) })}
        />
      </div>
      <DeleteIconButton onClick={onRemove} label={t("common.delete")} />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs text-mute">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        className={cn(fieldClass, "tabular-nums")}
        value={value === 0 && optional ? "" : value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DeleteIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center self-start rounded-full border border-hairline text-mute hover:border-red-300 hover:text-red-600"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
