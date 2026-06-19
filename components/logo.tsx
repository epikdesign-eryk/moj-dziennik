import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { icon: string; text: string; gap: string }> = {
  sm: { icon: "size-6", text: "text-base", gap: "gap-2" },
  md: { icon: "size-7", text: "text-xl", gap: "gap-2.5" },
  lg: { icon: "size-10", text: "text-3xl", gap: "gap-3" },
};

/**
 * Logo aplikacji „Mój Dziennik": ikona otwartej książki + nazwa zapisana
 * krojem nagłówkowym (serif). Spójny branding w sidebarze, nagłówku mobile
 * i na ekranie logowania.
 */
export function Logo({
  size = "md",
  href,
  showText = true,
  className,
}: {
  size?: Size;
  href?: string;
  showText?: boolean;
  className?: string;
}) {
  const s = SIZES[size];

  const inner = (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <BookOpen className={cn("shrink-0 text-foreground", s.icon)} strokeWidth={1.75} aria-hidden />
      {showText && (
        <span className={cn("font-heading font-semibold tracking-tight text-foreground", s.text)}>
          Mój Dziennik
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Mój Dziennik" className="inline-flex transition-opacity hover:opacity-80">
        {inner}
      </Link>
    );
  }

  return inner;
}
