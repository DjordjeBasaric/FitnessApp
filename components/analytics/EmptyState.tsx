import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function AnalyticsEmptyState({ title, description, actionHref, actionLabel }: Props) {
  return (
    <div className="verge-card flex flex-col items-center gap-4 rounded-[var(--rounded-md)] px-6 py-14 text-center">
      <p className="font-heading-md text-ink">{title}</p>
      <p className="max-w-md text-base leading-relaxed text-mute">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild variant="default" className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
