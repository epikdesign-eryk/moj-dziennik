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

/** Krótszy zapis daty na listę (np. „29 maj"). */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
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
