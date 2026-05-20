import type { UserContext } from "@/lib/schemas/userContext";

export function ProfileSummary({ profile }: { profile: UserContext }) {
  const rows: { label: string; value: string }[] = [];

  if (profile.allergiesOrAvoid?.trim()) rows.push({ label: "Izbjegavanja", value: profile.allergiesOrAvoid });
  if (profile.dietaryNote?.trim()) rows.push({ label: "Ishrana", value: profile.dietaryNote });
  if (profile.ageYears) rows.push({ label: "Godine", value: String(profile.ageYears) });
  if (profile.sex) rows.push({ label: "Spol", value: profile.sex });
  if (profile.heightCm) rows.push({ label: "Visina", value: `${profile.heightCm} cm` });
  if (profile.sportNote?.trim()) rows.push({ label: "Trening", value: profile.sportNote });

  if (!rows.length) {
    return <p className="text-base text-mute">Profil je još prazan — opiši se u chatu ispod.</p>;
  }

  return (
    <dl className="space-y-3 text-base">
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="font-caption-sm text-mint">{r.label}</dt>
          <dd className="mt-1 text-charcoal">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
