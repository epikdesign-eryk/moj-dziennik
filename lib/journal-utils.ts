// Pomocnicze funkcje prezentacyjne dla wpisów dziennika.

import type { Mood } from "@/types/journal";

/** Emoji odpowiadające skali nastroju. */
export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Źle" },
  { value: 2, emoji: "🙁", label: "Słabo" },
  { value: 3, emoji: "😐", label: "Tak sobie" },
  { value: 4, emoji: "🙂", label: "Dobrze" },
  { value: 5, emoji: "😄", label: "Świetnie" },
];

export function moodEmoji(mood: Mood): string {
  return MOODS.find((m) => m.value === mood)?.emoji ?? "😐";
}

export function moodLabel(mood: Mood): string {
  return MOODS.find((m) => m.value === mood)?.label ?? "";
}

/** Formatuje datę ISO na czytelny, polski zapis z godziną (np. „29 maja 2026, 14:32"). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Długi zapis z dniem tygodnia i godziną, np. „czwartek, 21 maja 2026 · 21:30".
 * Używany w nagłówku podglądu wpisu (wyświetlany wielkimi literami przez CSS).
 */
export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

/** Data bez godziny, np. „18 czerwca 2026" (w UI często wyświetlana wielkimi literami). */
export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Krótszy zapis daty na listę (np. „29 maj"). */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}

/** Lokalny klucz dnia w formacie `YYYY-MM-DD` (z Date lub ISO string). */
export function toLocalYMD(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Czy wpis (ISO) należy do dnia oznaczonego kluczem `YYYY-MM-DD`. */
export function isSameLocalDay(iso: string, ymd: string): boolean {
  return toLocalYMD(iso) === ymd;
}

/**
 * Okno dni do paska kalendarza — domyślnie 120 dni wstecz + dziś (dziś na końcu),
 * tak by najnowszy dzień był po prawej (jak w Imperfect).
 */
export function buildDayRange(today: Date, back = 120, forward = 0): Date[] {
  const days: Date[] = [];
  for (let i = back; i > 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  days.push(new Date(today));
  for (let i = 1; i <= forward; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Etykiety kafelka paska dni: krótki dzień tygodnia (pl) + numer dnia. */
export function dayStripLabels(date: Date): { weekday: string; day: string } {
  return {
    weekday: date.toLocaleDateString("pl-PL", { weekday: "short" }),
    day: String(date.getDate()),
  };
}

/** Zamienia HTML treści na czysty tekst i przycina do krótkiego fragmentu. */
export function excerpt(html: string, maxLength = 140): string {
  const text =
    typeof document !== "undefined"
      ? (() => {
          const el = document.createElement("div");
          el.innerHTML = html;
          return el.textContent ?? "";
        })()
      : html.replace(/<[^>]*>/g, " ");
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength).trimEnd()}…` : clean;
}
