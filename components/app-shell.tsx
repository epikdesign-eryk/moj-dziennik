"use client";

import { EntriesSidebar } from "@/components/entries-sidebar";

/**
 * Powłoka aplikacji.
 * - mobile: renderuje tylko `children` (pełnoekranowe strony, jak dotąd),
 * - lg+: układ dwukolumnowy master–detail — stały panel boczny z listą wpisów
 *   po lewej i zawartość aktywnej strony (podgląd/edycja/formularz) po prawej,
 *   każda kolumna z własnym scrollem.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:h-screen lg:grid-cols-[22rem_1fr]">
      <EntriesSidebar />
      <div className="lg:h-screen lg:overflow-y-auto">{children}</div>
    </div>
  );
}
