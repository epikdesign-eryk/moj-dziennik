"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useDragScroll } from "@/lib/use-drag-scroll";
import { cn } from "@/lib/utils";
import {
  buildDayRange,
  dayStripLabels,
  toLocalYMD,
  isSameLocalDay,
} from "@/lib/journal-utils";
import { useSelectedDay } from "@/lib/selected-day";
import { useEntries } from "@/lib/use-entries";

/**
 * Poziomy pasek dni (inspiracja: Imperfect). Dziś domyślnie zaznaczone i
 * dosunięte do widoku. Klik w dzień filtruje listę wpisów (przez useSelectedDay).
 * Kropka pod numerem oznacza, że w danym dniu istnieją wpisy.
 */
export function DayStrip({ surface = "background" }: { surface?: "background" | "sidebar" } = {}) {
  const { selectedDay, setSelectedDay, today } = useSelectedDay();
  const { entries } = useEntries();

  const days = useMemo(() => {
    // Bazujemy na dzisiejszej dacie; gdy `today` jeszcze pusty (przed mount),
    // i tak liczymy od teraz — lista i tak dostanie klucze po zamontowaniu.
    const base = today ? new Date(`${today}T00:00:00`) : new Date();
    // Kilka dni „w przód" — pokazujemy je wyszarzone po prawej, żeby dziś mógł
    // być wycentrowany. Są nieklikalne i nie da się do nich doscrollować.
    return buildDayRange(base, 120, 7);
  }, [today]);

  // Zbiór dni (YYYY-MM-DD), które mają wpisy — do wyświetlenia kropki.
  const daysWithEntries = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(toLocalYMD(e.date));
    return set;
  }, [entries]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const todayRef = useRef<HTMLButtonElement | null>(null);

  // Pozycja przewinięcia (scrollLeft), przy której „dziś" jest dokładnie na
  // środku szerokości paska. To jednocześnie maksymalny dozwolony scroll —
  // dalej (w przyszłość) nie pozwalamy się przewinąć.
  const todayCenterScrollLeft = (): number | null => {
    const el = scrollRef.current;
    const t = todayRef.current;
    if (!el || !t) return null;
    const er = el.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    const delta = tr.left + tr.width / 2 - (er.left + er.width / 2);
    return el.scrollLeft + delta;
  };

  // Na desktopie: scroll kółkiem (pionowy → poziomy) i przeciąganie myszką.
  const isDragging = useDragScroll(scrollRef);

  // Czy pasek jest odsunięty od „dziś" (dziś jest skrajnie po prawej) — wtedy
  // pokazujemy pływający przycisk powrotu.
  const [showBackToToday, setShowBackToToday] = useState(false);

  // Po zamontowaniu / zmianie wyboru dosuń aktywny kafelek do widoku.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "auto",
    });
  }, [selectedDay]);

  // Śledź pozycję przewinięcia: blokuj scroll „w przyszłość" (poza wycentrowane
  // „dziś") i pokaż przycisk powrotu, gdy odjechaliśmy w przeszłość (w lewo).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const center = todayCenterScrollLeft();
      if (center == null) return;
      // Twardy limit: nie pozwól przewinąć dalej niż wycentrowane „dziś".
      if (el.scrollLeft > center + 1) {
        el.scrollLeft = center;
        return;
      }
      setShowBackToToday(center - el.scrollLeft > 96);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [days.length]);

  function goToToday() {
    if (today) setSelectedDay(today);
    const el = scrollRef.current;
    const center = todayCenterScrollLeft();
    if (el && center != null) el.scrollTo({ left: center, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={cn(
          "no-scrollbar flex gap-3 overflow-x-auto px-0.5 py-2",
          // Na desktopie pokazujemy „chwytkę"; w trakcie ciągnięcia — zaciśniętą dłoń.
          "lg:cursor-grab",
          isDragging && "lg:cursor-grabbing lg:select-none",
        )}
      >
      {days.map((date, i) => {
        const ymd = toLocalYMD(date);
        const { weekday, day } = dayStripLabels(date);
        const isSelected = ymd === selectedDay;
        const isToday = ymd === today;
        const isFuture = today !== "" && ymd > today;
        const hasEntries = daysWithEntries.has(ymd);

        // Separator z nazwą miesiąca przed pierwszym dniem oraz przy każdej
        // zmianie miesiąca — żeby dni z różnych miesięcy się nie zlewały.
        const prev = days[i - 1];
        const showMonth = i === 0 || prev.getMonth() !== date.getMonth();
        const monthLabel = date.toLocaleDateString("pl-PL", { month: "long" });

        return (
          <div key={ymd} className="flex shrink-0 items-stretch gap-3">
            {showMonth && (
              <div className="flex items-center gap-2 pl-1 pr-1 first:pl-0">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                  {monthLabel}
                </span>
                <span className="h-[4.5rem] w-px shrink-0 self-center bg-border" aria-hidden />
              </div>
            )}
          <button
            ref={(node) => {
              if (isSelected) activeRef.current = node;
              if (isToday) todayRef.current = node;
            }}
            type="button"
            disabled={isFuture}
            onClick={() => setSelectedDay(ymd)}
            aria-pressed={isSelected}
            aria-current={isToday ? "date" : undefined}
            className={cn(
              "flex h-[4.5rem] w-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-[12px] transition-all",
              isFuture
                ? "cursor-not-allowed bg-transparent opacity-40"
                : isSelected
                  ? "bg-card shadow-md"
                  : "bg-transparent hover:bg-card/60",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-[0.12em]",
                isSelected ? "text-muted-foreground" : "text-muted-foreground/70",
              )}
            >
              {isToday ? "dziś" : weekday}
            </span>
            <span
              className={cn(
                "text-lg leading-none",
                isSelected
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/60",
              )}
            >
              {day}
            </span>
            <span
              className={cn(
                "h-1 w-1 rounded-full",
                hasEntries ? "bg-primary" : "bg-transparent",
              )}
              aria-hidden
            />
          </button>
          </div>
        );
      })}
    </div>

      {showBackToToday && (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end pl-12 pr-0.5",
            "bg-gradient-to-l to-transparent",
            surface === "sidebar"
              ? "from-sidebar via-sidebar"
              : "from-background via-background",
          )}
        >
          <button
            type="button"
            onClick={goToToday}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-md transition-colors hover:bg-accent animate-in fade-in slide-in-from-right-4 duration-300 ease-out"
          >
            Wróć do dzisiaj
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Pomocnik filtrowania listy wpisów do wybranego dnia. */
export function filterByDay<T extends { date: string }>(
  items: T[],
  ymd: string,
): T[] {
  if (!ymd) return items;
  return items.filter((i) => isSameLocalDay(i.date, ymd));
}
