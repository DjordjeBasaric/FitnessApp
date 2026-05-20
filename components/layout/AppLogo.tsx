import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** hero = sidebar; sm = mobile header; kicker = iznad naslova stranice */
  size?: "hero" | "sm" | "kicker";
  asLink?: boolean;
};

export function AppLogo({ className, size = "hero", asLink = false }: Props) {
  const mark = (
    <span
      className={cn(
        "leading-none tracking-tight text-ink",
        size === "hero" &&
          "block w-full font-display text-[4rem] font-black uppercase leading-[0.88] tracking-[0.05em]",
        size === "sm" && "text-[1.75rem] leading-none",
        size === "kicker" && "text-[1.125rem] leading-none",
        className,
      )}
      aria-label="FAIT"
    >
      F<span className="text-mint">AI</span>T
    </span>
  );

  if (asLink) {
    return (
      <Link href="/unos" className="verge-link block w-full">
        {mark}
      </Link>
    );
  }

  return mark;
}
