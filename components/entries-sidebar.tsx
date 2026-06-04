"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EntryListItem } from "@/components/entry-list-item";
import { LogoutButton } from "@/components/logout-button";
import { DayStrip, filterByDay } from "@/components/day-strip";
import { useEntries } from "@/lib/use-entries";
import { useSelectedDay } from "@/lib/selected-day";

/**
 * Stały lewy panel na desktopie (widok master–detail à la Apple Notes).
 * U góry pasek dni, pod nim lista wpisów wybranego dnia. Dodawać można tylko
 * do dnia dzisiejszego.
 */
export function EntriesSidebar() {
  const { entries, loaded, removeEntry } = useEntries();
  const { selectedDay, today } = useSelectedDay();
  const pathname = usePathname();

  const dayEntries = filterByDay(entries, selectedDay);
  const isToday = selectedDay !== "" && selectedDay === today;

  return (
    <aside className="hidden border-r border-border bg-sidebar lg:flex lg:h-screen lg:flex-col">
      <header className="border-b border-border px-3 py-3">
        <Link
          href="/"
          className="mb-3 inline-block px-1 text-base font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          Mój Dziennik
        </Link>
        <DayStrip />
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

      <footer className="border-t border-border px-3 py-3">
        <LogoutButton />
      </footer>
    </aside>
  );
}
