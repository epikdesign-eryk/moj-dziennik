"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EntryListItem } from "@/components/entry-list-item";
import { LogoutButton } from "@/components/logout-button";
import { CalendarJump } from "@/components/calendar-jump";
import { TherapistPicker } from "@/components/therapist-picker";
import { DayStrip, filterByDay } from "@/components/day-strip";
import { Logo } from "@/components/logo";
import { useEntries } from "@/lib/use-entries";
import { useSelectedDay } from "@/lib/selected-day";
import { createClient } from "@/lib/supabase/client";

/**
 * Stały lewy panel na desktopie (widok master–detail à la Apple Notes).
 * U góry pasek dni, pod nim lista wpisów wybranego dnia. Dodawać można tylko
 * do dnia dzisiejszego.
 */
export function EntriesSidebar() {
  const { entries, loaded, removeEntry } = useEntries();
  const { selectedDay, today } = useSelectedDay();
  const pathname = usePathname();
  const userEmail = useUserEmail();

  const dayEntries = filterByDay(entries, selectedDay);
  const isToday = selectedDay !== "" && selectedDay === today;

  return (
    <aside className="hidden border-r border-border bg-sidebar lg:flex lg:h-screen lg:flex-col">
      <header className="border-b border-border px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Logo size="sm" href="/" />
          <div className="flex items-center gap-1.5">
            <TherapistPicker />
            <CalendarJump />
          </div>
        </div>
        <DayStrip surface="sidebar" />
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!loaded ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Wczytywanie…</p>
        ) : dayEntries.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            {isToday ? "Brak wpisów — dodaj pierwszy po prawej." : "Brak wpisów tego dnia"}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {dayEntries.map((entry) => (
              <EntryListItem
                key={entry.id}
                entry={entry}
                onDelete={removeEntry}
                active={pathname === `/entry/${entry.id}`}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
        <span
          className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
          title={userEmail ?? undefined}
        >
          {userEmail ?? ""}
        </span>
        <LogoutButton />
      </footer>
    </aside>
  );
}

/** Pobiera e-mail aktualnie zalogowanego użytkownika (po stronie klienta). */
function useUserEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return email;
}
