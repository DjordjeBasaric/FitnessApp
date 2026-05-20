"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { AchievementBadges } from "./AchievementBadges";
import { FriendsLeaderboard } from "./FriendsLeaderboard";
import { PersonalDashboard } from "./PersonalDashboard";

export function TakmicenjeView() {
  return (
    <div className="space-y-8 lg:space-y-12">
      <PageHeader
        title="Takmičenje"
        kicker="Bodovi i strikovi"
        description="Boduješ se po preciznosti unosa, kontinuitetu i zdravim navikama — bez gladovanja."
      />
      <PersonalDashboard />
      <FriendsLeaderboard />
      <AchievementBadges />
    </div>
  );
}
