"use client";

import { useState } from "react";
import { CalendarDays, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toLocalYMD } from "@/lib/journal-utils";
import { useSelectedDay } from "@/lib/selected-day";
import { useEntries } from "@/lib/use-entries";
import { cn } from "@/lib/utils";

const MONTHS_SHORT = [
  "sty", "lut", "mar", "kwi", "maj", "cze",
  "lip", "sie", "wrz", "paź", "lis", "gru",
];
const WEEKDAYS = ["pon", "wto", "śro", "czw", "pią", "sob", "nie"];

interface CalendarJumpProps {
  /** Wyrównanie popupu względem ikony. */
  align?: "start" | "center" | "end";
  /** Dodatkowe klasy przycisku-ikony. */
  className?: string;
}

/**
 * Ikona kalendarza otwierająca picker w stylu Windows: domyślnie siatka dni
 * wybranego miesiąca, a po kliknięciu nagłówka — siatka miesięcy z nawigacją
 * roku. Wybór dnia ustawia „wybrany dzień" (pasek dni dosuwa go do widoku).
 */
export function CalendarJump({ align = "end", className }: CalendarJumpProps) {
  const { selectedDay, setSelectedDay, today } = useSelectedDay();
  const { entries } = useEntries();

  // Zbiór dni (YYYY-MM-DD) z wpisami — do kropki pod dniem (jak na pasku dni).
  const daysWithEntries = new Set(entries.map((e) => toLocalYMD(e.date)));

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const fallback = selectedDay || today || toLocalYMD(new Date());
  const [viewYear, setViewYear] = useState(() => Number(fallback.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(fallback.slice(5, 7)) - 1);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Po otwarciu zaczynamy od widoku dni i synchronizujemy się z wyborem.
      setView("days");
      const base = selectedDay || today || toLocalYMD(new Date());
      setViewYear(Number(base.slice(0, 4)));
      setViewMonth(Number(base.slice(5, 7)) - 1);
    }
  }

  function stepMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function pickDay(ymd: string) {
    setSelectedDay(ymd);
    setOpen(false);
  }

  // Siatka 6×7 dni (poniedziałek pierwszy), z dniami sąsiednich miesięcy.
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(viewYear, viewMonth, 1 - startOffset + i);
    return {
      ymd: toLocalYMD(date),
      day: date.getDate(),
      inMonth: date.getMonth() === viewMonth,
    };
  });

  const monthTitle = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString("pl-PL", { month: "long", year: "numeric" });

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Wybierz datę"
            className={cn("text-muted-foreground hover:text-foreground", className)}
          />
        }
      >
        <CalendarDays className="h-4 w-4" />
      </PopoverTrigger>

      <PopoverContent align={align} className="w-72">
        {/* Nagłówek: tytuł (przełącza widok) + nawigacja w górę/dół. */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setView(view === "days" ? "months" : "days")}
            className="rounded-md px-2 py-1 text-sm font-medium capitalize transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {view === "days" ? monthTitle : viewYear}
          </button>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Wstecz"
              onClick={() => (view === "days" ? stepMonth(-1) : setViewYear((y) => y - 1))}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Dalej"
              onClick={() => (view === "days" ? stepMonth(1) : setViewYear((y) => y + 1))}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {view === "days" ? (
          <>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="flex h-7 items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c) => {
                const isSelected = c.ymd === selectedDay;
                const isToday = c.ymd === today;
                const hasEntries = daysWithEntries.has(c.ymd);
                return (
                  <button
                    key={c.ymd}
                    type="button"
                    onClick={() => pickDay(c.ymd)}
                    className={cn(
                      "relative flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                      !c.inMonth && "text-muted-foreground/40",
                      c.inMonth && "text-foreground hover:bg-accent",
                      isToday && !isSelected && "ring-1 ring-border",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    {c.day}
                    {hasEntries && (
                      <span
                        className={cn(
                          "absolute bottom-1 h-1 w-1 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-primary",
                          !c.inMonth && "opacity-50",
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-4 gap-1">
            {MONTHS_SHORT.map((m, idx) => {
              const isSelected =
                selectedDay !== "" &&
                Number(selectedDay.slice(0, 4)) === viewYear &&
                Number(selectedDay.slice(5, 7)) - 1 === idx;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setViewMonth(idx);
                    setView("days");
                  }}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-lg text-sm capitalize transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
