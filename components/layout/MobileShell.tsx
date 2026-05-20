"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { getNavItems } from "@/components/layout/nav";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { cn } from "@/lib/utils";

function navActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  return pathname === base;
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/unos";
  const { t } = useLocale();
  const navItems = getNavItems(t).filter((n) => !n.desktopOnly);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink lg:hidden">
      <main className="flex-1 overflow-y-auto px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t border-hairline-soft bg-surface",
          "pb-[env(safe-area-inset-bottom)]",
        )}
        aria-label="Navigacija"
      >
        <div
          className="grid h-14"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map(({ href, shortLabel, Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                scroll={false}
                aria-label={shortLabel}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "verge-link flex items-center justify-center transition-colors duration-150",
                  active ? "text-mint nav-active-inset" : "text-mute hover:text-link-hover",
                )}
              >
                <Icon className="size-6 stroke-[1.5]" aria-hidden />
              </Link>
            );
          })}
        </div>
      </nav>

      <DisclaimerFooter variant="mobile" />
    </div>
  );
}
