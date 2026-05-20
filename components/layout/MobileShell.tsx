"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { AppLogo } from "@/components/layout/AppLogo";
import { getNavItems, pageTitle } from "@/components/layout/nav";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { cn } from "@/lib/utils";

function navActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  return pathname === base;
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/unos";
  const { t } = useLocale();
  const title = pageTitle(pathname, t);
  const navItems = getNavItems(t).filter((n) => !n.desktopOnly);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink lg:hidden">
      <header className="sticky top-0 z-50 border-b border-hairline-soft bg-canvas pt-[env(safe-area-inset-top)]">
        <div className="relative z-50 px-4 py-3">
          <AppLogo size="sm" asLink />
          <p className="truncate font-heading-lg uppercase text-ink">{title}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t border-hairline-soft bg-surface",
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <div
          className="grid h-[3.75rem]"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map(({ href, shortLabel, Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                scroll={false}
                className={cn(
                  "verge-link flex flex-col items-center justify-center gap-0.5 transition-colors duration-150",
                  active ? "text-mint nav-active-inset" : "text-mute hover:text-link-hover",
                )}
              >
                <Icon className="size-5 stroke-[1.5]" aria-hidden />
                <span className="font-caption-sm">{shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <DisclaimerFooter variant="mobile" />
    </div>
  );
}
