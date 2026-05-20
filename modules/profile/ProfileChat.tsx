"use client";

import { useMemo } from "react";
import type { UserContext } from "@/lib/schemas/userContext";
import { formatAssistantReply } from "@/lib/chat/conversation";
import { buildProfileOpeningMessage, getMissingProfileHints } from "@/lib/onboarding/profileQuestions";
import { isProfileMeaningful } from "@/lib/onboarding/status";
import { mergeProfilePatch } from "@/lib/server/coerceProfilePlan";
import { setUserContext } from "@/lib/supabase/queries/userContext";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";

import { SetupChat } from "@/components/chat/SetupChat";
import { ProfileSummary } from "@/modules/profile/ProfileSummary";

type Props = {
  profile: UserContext;
  refresh: () => void;
  onSaved?: () => void;
  /** U onboardingu: počni sa AI pitanjem */
  conversational?: boolean;
};

const HINTS = [
  "Odgovori na pitanje — možeš i jednom rečenicom.",
  "AI pamti razgovor i postavlja sljedeće korake.",
  "Enter šalje · Shift+Enter novi red.",
];

export function ProfileChat({ profile, refresh, onSaved, conversational = true }: Props) {
  const { locale } = useLocale();
  const { user } = useAuth();
  const initialMessages = useMemo(() => {
    if (!conversational) return [];
    return [{ role: "assistant" as const, text: buildProfileOpeningMessage(profile) }];
  }, [conversational, profile]);

  async function handleSubmit(message: string, history: import("@/lib/chat/conversation").ConversationTurn[]) {
    const res = await fetch("/api/parse-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        currentProfile: profile,
        history,
        locale,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Servis nedostupan.");

    let working = profile;

    if (data.profilePatch && user) {
      working = mergeProfilePatch(working, data.profilePatch);
      await setUserContext(user.id, working);
      refresh();
    }

    if (data.needsClarification) {
      const reply = formatAssistantReply({
        assistantMessage: data.assistantMessage,
        questions: data.questions,
      });
      const extra =
        data.profilePatch && Object.keys(data.profilePatch).length
          ? "\n\n(Zapisao sam što si već rekao — nastavi odgovorom.)"
          : "";
      return { assistantLines: [reply + extra] };
    }

    if (!isProfileMeaningful(working)) {
      const missing = getMissingProfileHints(working);
      const followUp = formatAssistantReply({
        assistantMessage: data.assistantMessage,
        questions: [
          missing.length
            ? `Još mi treba: ${missing.slice(0, 2).join(" i ")}.`
            : "Možeš li dodati još nešto o ishrani ili treningu?",
        ],
      });
      return { assistantLines: [followUp] };
    }

    onSaved?.();

    const lines: string[] = [];
    if (data.assistantMessage) lines.push(data.assistantMessage);
    lines.push("Profil je spreman. Možeš nastaviti na plan ili doraditi ručno.");
    return { assistantLines: lines };
  }

  return (
    <SetupChat
      hints={HINTS}
      placeholder="Tvoj odgovor…"
      initialMessages={initialMessages}
      onSubmit={handleSubmit}
      emptyState={
        <div className="space-y-4 py-4">
          <p className="font-heading-md text-ink">Tvoj profil za AI</p>
          <p className="text-base text-mute">Odgovori na pitanja — profil se puni dok razgovaraš.</p>
          <div className="verge-card-surface rounded-[var(--rounded-md)] p-4">
            <ProfileSummary profile={profile} />
          </div>
        </div>
      }
    />
  );
}
