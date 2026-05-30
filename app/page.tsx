"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Plus, BookOpen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EntryListItem } from "@/components/entry-list-item";
import { useEntries } from "@/lib/use-entries";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { entries, loaded, removeEntry } = useEntries();
  const [dragging, setDragging] = useState(false);
  const isEmpty = loaded && entries.length === 0;

  // Dzisiejsza data i powitanie ustawiane po zamontowaniu (unika rozjazdu hydracji).
  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState("Dzień dobry");
  useEffect(() => {
    const now = new Date();
    setToday(
      now.toLocaleDateString("pl-PL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
    const hour = now.getHours();
    setGreeting(hour >= 18 || hour < 5 ? "Dobry wieczór" : "Dzień dobry");
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-28">
      <header className="mb-8">
        <p className="flex flex-wrap items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
          <span>Mój Dziennik</span>
          {today && (
            <>
              <span aria-hidden>·</span>
              <span className="text-xs">{today}</span>
            </>
          )}
        </p>
        <h1 className="text-3xl font-semibold">{greeting}</h1>
      </header>

      {!loaded ? (
        <p className="text-muted-foreground">Wczytywanie…</p>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Brak wpisów</p>
            <p className="text-sm text-muted-foreground">
              Zacznij od zapisania przemyśleń z dzisiejszego dnia.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <EntryListItem
              key={entry.id}
              entry={entry}
              onDelete={removeEntry}
              onDragChange={setDragging}
            />
          ))}
        </div>
      )}

      <div
        className={cn(
          "fixed inset-x-0 bottom-6 z-50 flex justify-center transition-opacity",
          dragging && "pointer-events-none opacity-0",
        )}
      >
        <Link
          href="/new"
          aria-label="Dodaj wpis"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-14 rounded-full px-6 text-base shadow-lg transition-all",
            isEmpty &&
              "shadow-[0_0_11px_3px_rgba(234,160,60,0.3)] hover:shadow-[0_0_13px_3px_rgba(234,160,60,0.35)]",
          )}
        >
          <Plus className="h-5 w-5" />
          {isEmpty ? "Dodaj pierwszy wpis" : "Dodaj wpis"}
        </Link>
      </div>
    </main>
  );
}
