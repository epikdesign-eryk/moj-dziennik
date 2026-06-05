"use client";

// Sfiksowany pasek boczny dokumentacji (jak w docs Vercela). Spójny dla obu podstron
// /docs/api i /docs/mcp: dwie grupy-rozdziały, podświetlenie aktywnej strony i sekcji
// (scroll-spy). Na mobile zwija się do poziomego przełącznika nad treścią.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  {
    label: "API",
    href: "/docs/api",
    icon: BookOpen,
    items: [
      { id: "podstawy", label: "Podstawy" },
      { id: "uwierzytelnianie", label: "Uwierzytelnianie" },
      { id: "endpointy", label: "Endpointy" },
    ],
  },
  {
    label: "MCP",
    href: "/docs/mcp",
    icon: Boxes,
    items: [
      { id: "czym-jest", label: "Czym jest MCP" },
      { id: "polaczenie", label: "Połączenie" },
      { id: "narzedzia", label: "Narzędzia" },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scroll-spy: podświetla sekcję aktywnej strony, która jest aktualnie widoczna.
  useEffect(() => {
    const group = NAV.find((g) => pathname.startsWith(g.href)) ?? NAV[0];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    group.items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <>
      {/* Mobile: przełącznik API / MCP nad treścią */}
      <div className="flex gap-2 py-6 lg:hidden">
        {NAV.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              pathname.startsWith(g.href)
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <g.icon className="h-4 w-4" />
            {g.label}
          </Link>
        ))}
      </div>

      {/* Desktop: sfiksowany pasek boczny */}
      <aside className="hidden lg:block lg:w-52 lg:shrink-0">
        <nav className="sticky top-0 flex h-screen flex-col gap-6 overflow-y-auto py-8 pr-4">
          {NAV.map((group) => {
            const onPage = pathname.startsWith(group.href);
            return (
              <div key={group.href}>
                <Link
                  href={group.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-semibold transition-colors",
                    onPage
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <group.icon className="h-4 w-4" />
                  {group.label}
                </Link>
                <ul className="mt-2 flex flex-col gap-0.5 border-l pl-3">
                  {group.items.map((item) => {
                    const active = onPage && activeId === item.id;
                    return (
                      <li key={item.id}>
                        <Link
                          href={`${group.href}#${item.id}`}
                          className={cn(
                            "block py-0.5 text-sm transition-colors",
                            active
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
