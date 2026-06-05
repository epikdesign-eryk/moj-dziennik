// Wspólne narzędzia serwerowe dla route handlerów dziennika.
// Dzień lokalny liczymy w strefie Europe/Warsaw, spójnie z UI i agentem.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntryForAgent } from "@/lib/therapist";

/** Lokalny dzień (Europe/Warsaw) — en-CA daje format YYYY-MM-DD. */
export const warsawYMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dzisiejszy dzień `YYYY-MM-DD` w strefie Europe/Warsaw. */
export function todayWarsaw(): string {
  return warsawYMD.format(new Date());
}

/** Zamienia HTML wpisu (z TipTap) na czysty tekst — dla modelu i odpowiedzi API. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escapuje znaki specjalne HTML (przy zapisie tekstu z API jako treść wpisu). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Zamienia czysty tekst (z API) na HTML zgodny z edytorem: każdy niepusty
 * akapit (rozdzielony pustą linią lub nową linią) w osobnym `<p>`.
 */
export function textToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`);
  return paragraphs.length > 0 ? paragraphs.join("") : "<p></p>";
}

type EntryRow = { created_at: string; content: string; mood: number };

/**
 * Pobiera wszystkie wpisy danego użytkownika w formie dla agenta.
 * Jawny filtr po `user_id` działa zarówno w trybie cookie (RLS) jak i PAT (service-role).
 */
export async function loadEntriesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<EntryForAgent[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("created_at, content, mood")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as EntryRow[]).map((r) => ({
    day: warsawYMD.format(new Date(r.created_at)),
    date: r.created_at,
    mood: r.mood,
    text: stripHtml(r.content ?? ""),
  }));
}
