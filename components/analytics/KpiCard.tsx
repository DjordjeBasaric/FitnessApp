import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "mint" | "purple" | "muted";
};

export function KpiCard({ label, value, hint, tone = "default" }: Props) {
  return (
    <div className="verge-card-surface flex min-w-[9rem] flex-1 flex-col gap-2 rounded-[var(--rounded-md)] px-4 py-4">
      <p className="font-caption-sm text-mute">{label}</p>
      <p
        className={cn(
          "font-heading-lg tabular-nums",
          tone === "mint" && "text-mint",
          tone === "purple" && "text-purple",
          tone === "muted" && "text-mute",
          tone === "default" && "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-sm leading-snug text-mute">{hint}</p> : null}
    </div>
  );
}
