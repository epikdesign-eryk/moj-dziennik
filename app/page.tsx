"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EntryListItem } from "@/components/entry-list-item";
import { LogoutButton } from "@/components/logout-button";
import { CalendarJump } from "@/components/calendar-jump";
import { TherapistPicker } from "@/components/therapist-picker";
import { DayStrip, filterByDay } from "@/components/day-strip";
import { Logo } from "@/components/logo";
import { useEntries } from "@/lib/use-entries";
import { useSelectedDay } from "@/lib/selected-day";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { entries, loaded, removeEntry } = useEntries();
  const { selectedDay, today } = useSelectedDay();
  const [dragging, setDragging] = useState(false);

  // Powitanie wg pory dnia (mobile + desktop empty state).
  const [greeting, setGreeting] = useState("Dzień dobry");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour < 5 || hour >= 20 ? "Dobry wieczór" : "Dzień dobry",
    );
  }, []);

  // Imię właściciela konta — doklejamy do powitania („Powitanie, Imię!").
  const [name, setName] = useState("");
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const n = (data.user?.user_metadata?.name as string) ?? "";
      setName(n.trim());
    });
  }, []);

  const hello = name ? `${greeting}, ${name}!` : greeting;

  // Czy ekran powitalny (okładka) już zniknął. Na mobile powitanie montuje się
  // dopiero po doczytaniu wpisów — gdyby zamontowało się ZA okładką (pierwsze
  // wejście), jego animacja wejścia poszłaby w tle i po otwarciu książki było
  // widoczne „na sucho". Dlatego trzymamy je, aż okładka się otworzy
  // (IntroOverlay ustawia data-intro="seen"); wtedy wpływa świeżo, jako 3. etap.
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || el.dataset.intro === "seen") {
      setIntroDone(true);
      return;
    }
    const obs = new MutationObserver(() => {
      if (el.dataset.intro === "seen") {
        setIntroDone(true);
        obs.disconnect();
      }
    });
    obs.observe(el, { attributes: true, attributeFilter: ["data-intro"] });
    // Bezpiecznik, gdyby z jakiegoś powodu atrybut nie wpadł.
    const t = setTimeout(() => setIntroDone(true), 3500);
    return () => {
      obs.disconnect();
      clearTimeout(t);
    };
  }, []);

  const dayEntries = filterByDay(entries, selectedDay);
  const isToday = selectedDay !== "" && selectedDay === today;

  // Pełna data wybranego dnia (np. „niedziela, 18 czerwca") — nad powitaniem.
  const dateLabel = selectedDay
    ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString("pl-PL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-32">
      {/* Mobile: nagłówek + pasek dni + lista (desktop ma to w panelu bocznym). */}
      <div className="lg:hidden">
        {/* Górny pasek + kalendarz jako jeden blok wejścia (intro-stage-2). */}
        <div className="intro-stage-2">
          <header className="mb-6 flex items-center justify-between gap-3">
            <Logo size="sm" href="/" />
            <div className="flex w-auto items-center gap-1.5">
              <TherapistPicker />
              <CalendarJump />
              <LogoutButton />
            </div>
          </header>

          <div className="mb-6">
            <DayStrip />
          </div>
        </div>

        {!(loaded && introDone) ? (
          /* Rezerwujemy wysokość ekranu powitalnego: czekamy aż wpisy się
             doczytają I okładka się otworzy, żeby powitanie wpłynęło świeżo w
             gotowe miejsce (bez skoku układu, bez „popa” i bez grania za okładką). */
          <div className="min-h-[55vh]" aria-hidden />
        ) : dayEntries.length === 0 ? (
          isToday ? (
            <div className="intro-greeting flex min-h-[55vh] flex-col items-center justify-center gap-6 text-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {dateLabel}
                </p>
                <h1 className="mt-3 text-3xl font-semibold">{hello}</h1>
              </div>
              <Link
                href="/new"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 w-full max-w-[280px] rounded-[12px] text-base font-semibold shadow-sm",
                )}
              >
                Zacznij z dzisiejszym wpisem
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

      {/* Desktop: ekran powitalny w prawym panelu (taki sam jak na mobile).
          Czekamy aż okładka się otworzy (introDone), żeby powitanie zamontowało
          się świeżo i animacja wejścia nie zagrała za okładką. */}
      {!introDone ? (
        <div className="hidden min-h-[60vh] lg:block" aria-hidden />
      ) : (
        <div className="intro-greeting hidden min-h-[60vh] flex-col items-center justify-center gap-6 text-center lg:flex">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {dateLabel}
            </p>
            <h1 className="mt-3 text-3xl font-semibold">{hello}</h1>
          </div>
          {isToday && (
            <Link
              href="/new"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 w-full max-w-[280px] rounded-[12px] text-base font-semibold shadow-sm",
              )}
            >
              Zacznij z dzisiejszym wpisem
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
