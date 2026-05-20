import { AppLogo } from "@/components/layout/AppLogo";

type Props = {
  title: string;
  description?: string;
  kicker?: string;
};

export function PageHeader({ title, description, kicker }: Props) {
  return (
    <header className="mb-6 md:mb-[var(--spacing-section)]">
      {kicker ? (
        <p className="font-label-mono mb-3 text-mint">{kicker}</p>
      ) : (
        <div className="mb-2">
          <AppLogo size="kicker" />
        </div>
      )}
      <h1 className="font-display-hero text-ink">{title}</h1>
      {description ? (
        <p className="mt-4 max-w-2xl text-lg font-medium leading-relaxed text-mute md:text-xl">
          {description}
        </p>
      ) : null}
    </header>
  );
}
