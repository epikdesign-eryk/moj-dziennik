"use client";

import { usePathname } from "next/navigation";
import { EntriesSidebar } from "@/components/entries-sidebar";
import { AiBar } from "@/components/ai-bar";
import { IntroOverlay } from "@/components/intro-overlay";
import { SelectedDayProvider } from "@/lib/selected-day";
import { ActiveTherapistProvider } from "@/lib/active-therapist";

// Trasy renderowane bez powłoki master–detail (np. ekran logowania, dokumentacja).
const BARE_PATHS = ["/login", "/docs"];

/**
 * Powłoka aplikacji.
 * - mobile: renderuje tylko `children` (pełnoekranowe strony, jak dotąd),
 * - lg+: układ dwukolumnowy master–detail — stały panel boczny z listą wpisów
 *   po lewej i zawartość aktywnej strony (podgląd/edycja/formularz) po prawej,
 *   każda kolumna z własnym scrollem.
 * Pasek AI (AiBar) jest zaafiksowany na dole na obu szerokościach.
 */
export function AppShell({
  children,
  introSeen = false,
}: {
  children: React.ReactNode;
  introSeen?: boolean;
}) {
  const pathname = usePathname();
  if (BARE_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return (
    <SelectedDayProvider>
      <ActiveTherapistProvider>
        <div className="lg:grid lg:h-screen lg:grid-cols-[22rem_1fr]">
          <EntriesSidebar />
          <div className="lg:h-screen lg:overflow-y-auto">{children}</div>
        </div>
        <AiBar />
        <IntroOverlay seen={introSeen} />
      </ActiveTherapistProvider>
    </SelectedDayProvider>
  );
}
