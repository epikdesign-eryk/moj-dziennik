// Blokada pętli synchronizacji Supabase <-> Strapi.
//
// Obie strony trzymają ten sam wpis: Supabase `content` jako HTML (TipTap),
// Strapi `content` jako czysty tekst. Żeby porównanie było symetryczne, oba
// teksty normalizujemy przez `stripHtml` (na czystym tekście jest idempotentne —
// tylko zwija białe znaki). Mood to liczba, obrazy to posortowana lista ścieżek.
//
// Jeśli hash przychodzącej zmiany jest równy hashowi stanu po drugiej stronie,
// sync robi no-op — dzięki temu echo webhooka nie wywołuje kolejnej propagacji.

import { createHash } from "node:crypto";
import { stripHtml } from "@/lib/journal-server";

/** Tekst porównawczy niezależny od formatu (HTML albo plain) — zwija białe znaki. */
export function normalizedText(contentHtmlOrPlain: string): string {
  return stripHtml(contentHtmlOrPlain ?? "");
}

/** Stabilny hash treści wpisu (tekst + mood + ścieżki obrazów). */
export function entryHash(input: {
  content: string;
  mood: number;
  images: string[];
}): string {
  const text = normalizedText(input.content);
  const images = [...(input.images ?? [])].filter(Boolean).sort();
  const payload = JSON.stringify({ text, mood: Number(input.mood), images });
  return createHash("sha256").update(payload).digest("hex");
}
