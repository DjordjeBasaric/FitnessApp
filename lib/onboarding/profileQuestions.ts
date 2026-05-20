import type { UserContext } from "@/lib/schemas/userContext";
import { isProfileMeaningful } from "@/lib/onboarding/status";

/** Šta još fali za smislen profil — za početna AI pitanja. */
export function getMissingProfileHints(profile: UserContext): string[] {
  const missing: string[] = [];
  if (!profile.ageYears && !profile.heightCm) missing.push("godine i visinu");
  else {
    if (!profile.ageYears) missing.push("godine");
    if (!profile.heightCm) missing.push("visinu (cm)");
  }
  if (!profile.sex) missing.push("spol (opcionalno)");
  if (!profile.dietaryNote?.trim() && !profile.allergiesOrAvoid?.trim()) {
    missing.push("ishranu ili alergije/izbjegavanja");
  }
  if (!profile.sportNote?.trim()) missing.push("kako treniraš (sport, učestalost)");
  return missing;
}

export function buildProfileOpeningMessage(profile: UserContext): string {
  if (isProfileMeaningful(profile)) {
    return "Profil izgleda dobro popunjen. Ako želiš nešto promijeniti, samo napiši — inače možeš preći na plan ili ručnu izmjenu.";
  }

  const missing = getMissingProfileHints(profile);
  const focus = missing.slice(0, 2).join(" i ");

  return [
    "Zdravo! Postaviću tvoj profil kroz par kratkih pitanja — odgovaraj slobodno, jedno po jedno.",
    focus
      ? `Za početak: ${focus}?`
      : "Reci mi nešto o sebi, ishrani i treningu.",
  ].join("\n\n");
}
