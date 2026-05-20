"use client";

import { useMemo } from "react";
import type { GoalPlan } from "@/lib/schemas/goalPlan";
import type { UserContext } from "@/lib/schemas/userContext";
import { formatAssistantReply } from "@/lib/chat/conversation";
import { buildPlanOpeningMessage } from "@/lib/onboarding/planQuestions";
import { isPlanReady } from "@/lib/onboarding/status";
import { newPlan } from "@/lib/plans/createPlan";
import { setActivePlanId, upsertGoalPlan } from "@/lib/supabase/queries/goalPlans";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";

import { SetupChat } from "@/components/chat/SetupChat";

type Props = {
  profile: UserContext | null;
  activePlan?: GoalPlan;
  refresh: () => void;
  onSaved?: () => void;
  intent?: "create" | "update";
  conversational?: boolean;
};

const HINTS = [
  "Odgovori na pitanje — AI će pitati sljedeće ako treba.",
  "Primjer: „Mršavljenje, oko 1900 kcal, −0.5 kg sedmično.“",
  "Enter šalje · Shift+Enter novi red.",
];

export function PlanChat({
  profile,
  activePlan,
  refresh,
  onSaved,
  intent,
  conversational = true,
}: Props) {
  const mode = intent ?? (activePlan ? "update" : "create");
  const { locale } = useLocale();
  const { user } = useAuth();

  const initialMessages = useMemo(() => {
    if (!conversational) return [];
    return [{ role: "assistant" as const, text: buildPlanOpeningMessage(activePlan) }];
  }, [conversational, activePlan]);

  async function handleSubmit(message: string, history: import("@/lib/chat/conversation").ConversationTurn[]) {
    const res = await fetch("/api/parse-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        currentProfile: profile ?? undefined,
        currentPlan: activePlan ?? null,
        intent: mode,
        history,
        locale,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Servis nedostupan.");

    if (!user) {
      throw new Error("Niste prijavljeni.");
    }

    if (data.needsClarification) {
      if (data.planPatch?.name && data.planPatch?.programType && data.planPatch?.targetDailyKcal) {
        let plan: GoalPlan;
        if (mode === "update" && activePlan) {
          plan = { ...activePlan, ...data.planPatch, id: activePlan.id, createdAt: activePlan.createdAt };
        } else {
          plan = newPlan(data.planPatch);
        }
        await upsertGoalPlan(user.id, plan);
        if (data.activate !== false) await setActivePlanId(user.id, plan.id);
        refresh();
      }

      const reply = formatAssistantReply({
        assistantMessage: data.assistantMessage,
        questions: data.questions,
      });
      return { assistantLines: [reply] };
    }

    const patch = data.planPatch as Partial<GoalPlan>;

    let plan: GoalPlan;
    if (mode === "update" && activePlan) {
      plan = { ...activePlan, ...patch, id: activePlan.id, createdAt: activePlan.createdAt };
    } else {
      plan = newPlan(patch);
    }

    await upsertGoalPlan(user.id, plan);
    if (data.activate !== false) await setActivePlanId(user.id, plan.id);
    refresh();
    onSaved?.();

    const lines: string[] = [];
    if (data.assistantMessage) lines.push(data.assistantMessage);
    lines.push(
      `Plan „${plan.name}“ sačuvan${data.activate !== false ? " i aktiviran" : ""}.` +
        (plan.targetDailyKcal ? ` Cilj: ${Math.round(plan.targetDailyKcal)} kcal/d.` : ""),
    );
    return { assistantLines: lines };
  }

  return (
    <SetupChat
      hints={HINTS}
      placeholder="Tvoj odgovor…"
      initialMessages={initialMessages}
      onSubmit={handleSubmit}
      emptyState={
        <div className="space-y-3 py-4">
          <p className="font-heading-md text-ink">
            {mode === "update" ? "Izmijeni plan" : "Novi plan"}
          </p>
          <p className="text-base text-mute">AI postavlja pitanja dok ne složi ciljne kcal i makroe.</p>
          {activePlan && isPlanReady(activePlan) ? (
            <p className="font-caption-sm text-mint">
              Aktivno: {activePlan.name} · {Math.round(activePlan.targetDailyKcal!)} kcal
            </p>
          ) : null}
        </div>
      }
    />
  );
}
