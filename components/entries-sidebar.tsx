"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EntryListItem } from "@/components/entry-list-item";
import { useEntries } from "@/lib/use-entries";

/**
 * Stały lewy panel na desktopie (widok master–detail à la Apple Notes).
 * Reużywa kartek `EntryListItem`; aktywny wpis wyróżniany na podstawie ścieżki.
 */
export function EntriesSidebar() {
  const { entries, loaded, removeEntry } = useEntries();
  const pathname = usePathname();

  // Dzień i data — jak w nagłówku mobilnym; ustawiane po zamontowaniu.
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("pl-PL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }, []);

  return (
    <aside className="hidden border-r border-border bg-sidebar lg:flex lg:h-screen lg:flex-col">
      <header className="border-b border-border px-4 py-4">
        <Link
          href="/"
          className="inline-block text-base font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          Mój Dziennik
        </Link>
        {today && (
          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            {today}
          </p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!loaded ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Wczytywanie…</p>
        ) : entries.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Brak wpisów</p>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
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
    </aside>
  );
}
