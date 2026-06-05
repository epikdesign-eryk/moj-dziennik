"use client";

import { useEffect, useMemo, useRef } from "react";
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
export function DayStrip() {
  const { selectedDay, setSelectedDay, today } = useSelectedDay();
  const { entries } = useEntries();

  const days = useMemo(() => {
    // Bazujemy na dzisiejszej dacie; gdy `today` jeszcze pusty (przed mount),
    // i tak liczymy od teraz — lista i tak dostanie klucze po zamontowaniu.
    const base = today ? new Date(`${today}T00:00:00`) : new Date();
    return buildDayRange(base);
  }, [today]);

  // Zbiór dni (YYYY-MM-DD), które mają wpisy — do wyświetlenia kropki.
  const daysWithEntries = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(toLocalYMD(e.date));
    return set;
  }, [entries]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Na desktopie: scroll kółkiem (pionowy → poziomy) i przeciąganie myszką.
  const isDragging = useDragScroll(scrollRef);

  // Po zamontowaniu / zmianie wyboru dosuń aktywny kafelek do widoku.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "auto",
    });
  }, [selectedDay]);

  return (
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
            ref={isSelected ? activeRef : undefined}
            type="button"
            onClick={() => setSelectedDay(ymd)}
            aria-pressed={isSelected}
            aria-current={isToday ? "date" : undefined}
            className={cn(
              "flex h-[4.5rem] w-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all",
              isSelected
                ? "border-foreground bg-foreground text-background shadow-md"
                : "border-border/60 bg-card text-muted-foreground shadow-sm hover:border-border hover:shadow-md",
            )}
          >
            <span className="text-[9px] font-light uppercase tracking-[0.12em]">
              {isToday ? "dziś" : weekday}
            </span>
            <span
              className={cn(
                "text-lg font-medium leading-none",
                !isSelected && "text-foreground",
              )}
            >
              {day}
            </span>
            <span
              className={cn(
                "h-1 w-1 rounded-full",
                hasEntries
                  ? isSelected
                    ? "bg-background"
                    : "bg-primary"
                  : "bg-transparent",
              )}
              aria-hidden
            />
          </button>
          </div>
        );
      })}
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
