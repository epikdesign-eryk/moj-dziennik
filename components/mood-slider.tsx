"use client";

import { useCallback, useEffect, useRef } from "react";
import { MOODS, moodLabel } from "@/lib/journal-utils";
import type { Mood } from "@/types/journal";
import { cn } from "@/lib/utils";

interface MoodSliderProps {
  /** Bieżący nastrój (slider zawsze ma jakąś pozycję). */
  value: Mood;
  /** Imię właściciela konta — wstawiane do nagłówka („{Imię}, Jak się czujesz…"). */
  name?: string;
  /** Wywoływane przy każdej zmianie — oznacza świadomy wybór użytkownika. */
  onChange: (mood: Mood) => void;
}

const STOPS = MOODS.length; // 5
const KNOB = 48; // px — szerokość uchwytu (w-12)

/** Ułamek 0..1 pozycji stopnia (1..5) na osi slidera. */
function fractionOf(value: Mood): number {
  return (value - 1) / (STOPS - 1);
}

/**
 * Krok 1 kreatora: wybór nastroju animowanym sliderem. Duże emoji + etykieta
 * nad spodem reagują na zmianę, a przeciągany biały uchwyt snapuje do 5 stopni
 * skali (zgodnej z `MOODS`). Klik w twarz też wybiera nastrój.
 */
export function MoodSlider({ value, name, onChange }: MoodSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const current = MOODS.find((m) => m.value === value) ?? MOODS[2];

  const setFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const stop = (Math.round(fraction * (STOPS - 1)) + 1) as Mood;
      onChange(stop);
    },
    [onChange],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      setFromClientX(e.clientX);
    }
    function onUp() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {name ? `${name}, ` : ""}Jak się czujesz dzisiaj?
      </p>

      {/* Duże emoji + etykieta — animowane przy zmianie nastroju. */}
      <div className="flex flex-col items-center gap-4">
        <span
          key={current.value}
          className="inline-block text-7xl leading-none animate-in zoom-in-50 duration-300"
          aria-hidden
        >
          {current.emoji}
        </span>
        <span className="font-serif text-2xl text-foreground">
          {moodLabel(value)}
        </span>
      </div>

      {/* Slider: pigułka z 5 twarzami + przeciągany biały uchwyt. */}
      <div className="w-full max-w-xs select-none">
        <div
          ref={trackRef}
          className="relative flex h-14 items-center rounded-full bg-secondary px-2"
          onPointerDown={(e) => {
            draggingRef.current = true;
            setFromClientX(e.clientX);
          }}
        >
          {/* Małe twarze jako stopnie skali. */}
          <div className="flex w-full items-center justify-between px-1">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-label={m.label}
                onClick={() => onChange(m.value)}
                onPointerDown={(e) => {
                  // Pozwól przeciągać zaczynając od twarzy; właściwy wybór robi onClick.
                  e.stopPropagation();
                  draggingRef.current = true;
                }}
                className={cn(
                  "z-0 text-lg transition-opacity",
                  m.value === value ? "opacity-0" : "opacity-50",
                )}
              >
                {m.emoji}
              </button>
            ))}
          </div>

          {/* Uchwyt — biały krążek z aktualnym emoji, przesuwa się do stopnia. */}
          <div
            className="pointer-events-none absolute top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card text-2xl shadow-md transition-[left] duration-300 ease-out"
            style={{
              left: `calc(${KNOB / 2}px + (100% - ${KNOB}px) * ${fractionOf(value)})`,
            }}
          >
            {current.emoji}
          </div>
        </div>
      </div>
    </div>
  );
}
