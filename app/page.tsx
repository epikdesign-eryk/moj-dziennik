"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Plus, BookOpen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EntryListItem } from "@/components/entry-list-item";
import { LogoutButton } from "@/components/logout-button";
import { CalendarJump } from "@/components/calendar-jump";
import { TherapistPicker } from "@/components/therapist-picker";
import { DayStrip, filterByDay } from "@/components/day-strip";
import { useEntries } from "@/lib/use-entries";
import { useSelectedDay } from "@/lib/selected-day";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { entries, loaded, removeEntry } = useEntries();
  const { selectedDay, today } = useSelectedDay();
  const [dragging, setDragging] = useState(false);

  // Powitanie wg pory dnia (mobile + desktop empty state).
  const [greeting, setGreeting] = useState("Dzień dobry");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 18 || hour < 5 ? "Dobry wieczór" : "Dzień dobry");
  }, []);

  const dayEntries = filterByDay(entries, selectedDay);
  const isToday = selectedDay !== "" && selectedDay === today;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-32">
      {/* Mobile: nagłówek + pasek dni + lista (desktop ma to w panelu bocznym). */}
      <div className="lg:hidden">
        <header className="mb-5">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Mój Dziennik
          </p>
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-3xl font-semibold">{greeting}</h1>
            <div className="flex w-auto items-center gap-1.5">
              <TherapistPicker />
              <CalendarJump />
              <LogoutButton />
            </div>
          </div>
        </header>

        <div className="mb-6">
          <DayStrip />
        </div>

        {!loaded ? (
          <p className="text-muted-foreground">Wczytywanie…</p>
        ) : dayEntries.length === 0 ? (
          isToday ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Brak wpisów</p>
                <p className="text-sm text-muted-foreground">
                  Zacznij od zapisania przemyśleń z dzisiejszego dnia.
                </p>
              </div>
              <Link
                href="/new"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 rounded-full px-6 text-base shadow-sm",
                )}
              >
                <Plus className="h-5 w-5" />
                Dodaj pierwszy wpis
              </Link>
            </div>
          ) : (
            <p className="py-10 text-center text-muted-foreground">
              Brak wpisów tego dnia.
            </p>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {dayEntries.map((entry) => (
              <EntryListItem
                key={entry.id}
                entry={entry}
                onDelete={removeEntry}
                onDragChange={setDragging}
              />
            ))}
            {isToday && (
              <Link
                href="/new"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full rounded-xl border-dashed",
                  dragging && "pointer-events-none opacity-0",
                )}
              >
                <Plus className="h-4 w-4" />
                Dodaj wpis
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Desktop: ekran powitalny w prawym panelu (lista jest w panelu bocznym). */}
      <div className="hidden min-h-[60vh] flex-col items-center justify-center gap-3 text-center lg:flex">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-3xl font-semibold">{greeting}</h1>
        <p className="max-w-sm text-muted-foreground">
          Wybierz wpis z listy po lewej lub dodaj nowy.
        </p>
        {isToday && (
          <Link
            href="/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-2 h-12 rounded-full px-6 text-base shadow-sm",
            )}
          >
            <Plus className="h-5 w-5" />
            Dodaj wpis
          </Link>
        )}
      </div>
    </main>
  );
}
