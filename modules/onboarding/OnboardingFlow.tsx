"use client";

import { useRouter } from "next/navigation";
import type { GoalPlan } from "@/lib/schemas/goalPlan";
import type { UserContext } from "@/lib/schemas/userContext";
import { getOnboardingStatus } from "@/lib/onboarding/status";

import { ProfileChat } from "@/modules/profile/ProfileChat";
import { PlanChat } from "@/modules/plans/PlanChat";
import { cn } from "@/lib/utils";

type Props = {
  profile: UserContext;
  activePlan?: GoalPlan;
  refresh: () => void;
};

export function OnboardingFlow({ profile, activePlan, refresh }: Props) {
  const router = useRouter();
  const status = getOnboardingStatus(profile, activePlan);
  const step = status.nextStep ?? "plan";

  function afterProfile() {
    refresh();
    // Ostaje na koraku 2 dok plan nije spreman — refresh prebacuje na PlanChat
  }

  function afterPlan() {
    refresh();
    router.replace("/unos");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <p className="font-caption-sm text-mint">Dobrodošao</p>
        <h1 className="mt-2 font-display-hero text-ink">Postavi profil i plan</h1>
        <p className="mt-4 text-lg text-mute">
          Dva koraka — porukom AI-u, kao u Unosu. Kasnije uređuješ u Profilu i Planovima (AI ili ručno).
        </p>
      </header>

      <ol className="flex justify-center gap-4 font-label-mono">
        <StepChip done={status.profileDone} active={step === "profile"} label="1 · Profil" />
        <StepChip done={status.planDone} active={step === "plan"} label="2 · Plan" />
      </ol>

      {step === "profile" ? (
        <ProfileChat profile={profile} refresh={refresh} onSaved={afterProfile} conversational />
      ) : (
        <PlanChat
          profile={profile}
          activePlan={activePlan}
          refresh={refresh}
          onSaved={afterPlan}
          intent={activePlan ? "update" : "create"}
          conversational
        />
      )}
    </div>
  );
}

function StepChip({
  done,
  active,
  label,
}: {
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <li
      className={cn(
        "rounded-[var(--rounded-md)] border px-4 py-2",
        done && "border-mint bg-mint/10 text-mint",
        active && !done && "border-mint bg-surface text-ink",
        !done && !active && "border-hairline-soft text-stone",
      )}
    >
      {label}
      {done ? " ✓" : ""}
    </li>
  );
}
