import type { LucideIcon } from "lucide-react";
import { CalendarDays, PencilLine, Scale, Settings, Trophy, Users } from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
  /** Sakrij iz mobilne bottom-nav (samo desktop). */
  desktopOnly?: boolean;
};

export function getNavItems(t: (key: MessageKey) => string): NavItem[] {
  return [
    { href: "/unos", label: t("nav.unos"), shortLabel: t("nav.unos"), Icon: PencilLine },
    {
      href: "/istorija",
      label: t("nav.history"),
      shortLabel: t("nav.history"),
      Icon: CalendarDays,
    },
    {
      href: "/tezina",
      label: t("nav.goal"),
      shortLabel: t("nav.goal"),
      Icon: Scale,
    },
    {
      href: "/takmicenje",
      label: t("nav.competition"),
      shortLabel: t("nav.competition"),
      Icon: Trophy,
    },
    {
      href: "/prijatelji",
      label: t("nav.friends"),
      shortLabel: t("nav.friends"),
      Icon: Users,
      desktopOnly: true,
    },
    {
      href: "/podesavanja",
      label: t("nav.settings"),
      shortLabel: t("nav.settings"),
      Icon: Settings,
    },
  ];
}

export function pageTitle(pathname: string, t: (key: MessageKey) => string): string {
  if (pathname.startsWith("/istorija")) return t("nav.history");
  if (pathname.startsWith("/tezina")) return t("nav.goal");
  if (pathname.startsWith("/takmicenje")) return t("nav.competition");
  if (pathname.startsWith("/prijatelji")) return t("nav.friends");
  if (pathname.startsWith("/podesavanja")) return t("nav.settings");
  return t("nav.unos");
}
