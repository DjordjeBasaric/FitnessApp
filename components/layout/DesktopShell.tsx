"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { AppLogo } from "@/components/layout/AppLogo";
import { getNavItems } from "@/components/layout/nav";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { cn } from "@/lib/utils";

function navActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  return pathname === base;
}

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/unos";
  const { t } = useLocale();
  const navItems = getNavItems(t);

  return (
    <div className="hidden min-h-screen bg-canvas text-ink lg:flex">
      <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-purple-rule bg-canvas">
        <div className="w-full border-b border-hairline-soft px-3 py-5">
          <AppLogo size="hero" asLink />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
          {navItems.map(({ href, label, Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                scroll={false}
                className={cn(
                  "verge-link flex items-center gap-3 rounded-[var(--rounded-md)] px-4 py-3 transition-colors duration-150",
                  active
                    ? "bg-surface text-mint nav-active-inset"
                    : "text-charcoal hover:text-link-hover",
                )}
              >
                <Icon className="size-5 shrink-0 stroke-[1.5]" aria-hidden />
                <span className="font-label-mono">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-10 py-[var(--spacing-section)] xl:px-16">{children}</main>
        <DisclaimerFooter className="px-10 xl:px-16" />
      </div>
    </div>
  );
}
