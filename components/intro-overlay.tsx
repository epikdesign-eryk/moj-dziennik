"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

/**
 * Ekran powitalny (loading / splash) — front okładki dziennika, który po krótkim
 * przytrzymaniu otwiera się jak drzwi (obrót 3D wokół lewej krawędzi),
 * odsłaniając aplikację. Reszta UI wchodzi etapami (klasy `intro-stage-*`
 * + animacje w globals.css).
 *
 * Gra RAZ NA SESJĘ. O tym, czy intro już było, decyduje serwer (sesyjne
 * ciasteczko `mj-intro` czytane w layout.tsx) i przekazuje to przez `seen` —
 * dzięki temu nie ma mismatchu hydracji ani mignięcia okładki po odświeżeniu.
 * Przy pierwszym graniu zapisujemy ciasteczko, by kolejny load pominął intro.
 */
export function IntroOverlay({ seen = false }: { seen?: boolean }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (seen) return;
    // Sesyjne ciasteczko (bez max-age → znika po zamknięciu przeglądarki).
    document.cookie = "mj-intro=1; path=/; samesite=lax";
  }, [seen]);

  if (seen || done) return null;

  return (
    <div
      className="intro-overlay pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
      aria-hidden
      onAnimationEnd={(e) => {
        // Po fazie znikania overlayu — twardo odmontuj (zwalnia warstwę 3D).
        if (e.animationName.startsWith("intro-overlay-out")) {
          document.documentElement.dataset.intro = "seen";
          setDone(true);
        }
      }}
    >
      <div className="intro-cover relative flex h-full w-full flex-col items-center justify-center bg-card text-foreground">
        {/* Logo w rogu (desktop) */}
        <span className="absolute left-6 top-6 hidden items-center gap-2 sm:inline-flex">
          <BookOpen className="size-6 text-foreground" strokeWidth={1.75} aria-hidden />
          <span className="font-heading text-base font-semibold tracking-tight">
            Mój Dziennik
          </span>
        </span>

        {/* Splash na środku */}
        <div className="flex flex-col items-center gap-5 px-6 text-center">
          <BookOpen className="intro-splash size-16 text-foreground" strokeWidth={1.5} aria-hidden />
          <h1 className="intro-splash font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Mój Dziennik
          </h1>
        </div>
      </div>
    </div>
  );
}
