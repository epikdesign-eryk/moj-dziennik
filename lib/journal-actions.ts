// Akcje domenowe dziennika, współdzielone przez REST (app/api/entries) i serwer MCP
// (app/api/[transport]). Cała walidacja + logika zapisu/odczytu w jednym miejscu, żeby
// oba interfejsy zachowywały się identycznie. Klient Supabase i userId podaje caller
// (cookie+RLS albo service-role+jawny userId).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  todayWarsaw,
  textToHtml,
  stripHtml,
  loadEntriesForUser,
} from "@/lib/journal-server";
import { inferMood } from "@/lib/mood-infer";
import { moodLabel } from "@/lib/journal-utils";
import type { Mood } from "@/types/journal";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Błąd z kodem HTTP — caller mapuje na JSON (REST) lub treść błędu (MCP). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isValidMood(n: unknown): n is Mood {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
}

export interface CreateEntryInput {
  text?: string;
  date?: string;
  mood?: number;
}

export interface CreatedEntry {
  id: string;
  date: string;
  mood: Mood;
  moodLabel: string;
  moodInferred: boolean;
  text: string;
}

/** Dodaje wpis dla użytkownika. Brak `mood` → wnioskowany z treści. */
export async function createEntryForUser(
  supabase: SupabaseClient,
  userId: string,
  input: CreateEntryInput,
): Promise<CreatedEntry> {
  const text = (input.text ?? "").trim();
  if (!text) throw new ApiError(400, "Pole 'text' jest wymagane.");

  const date = input.date ?? todayWarsaw();
  if (!YMD.test(date)) {
    throw new ApiError(400, "Pole 'date' musi mieć format YYYY-MM-DD.");
  }

  if (input.mood !== undefined && !isValidMood(input.mood)) {
    throw new ApiError(400, "Pole 'mood' musi być liczbą całkowitą 1–5.");
  }

  const moodInferred = input.mood === undefined;
  const mood: Mood = moodInferred ? await inferMood(text) : (input.mood as Mood);

  // created_at = dzień wpisu. Dziś → „teraz"; inny dzień → południe UTC
  // (ten sam dzień kalendarzowy w Europe/Warsaw).
  const createdAt =
    date === todayWarsaw() ? new Date().toISOString() : `${date}T12:00:00Z`;

  const { data, error } = await supabase
    .from("entries")
    .insert({
      content: textToHtml(text),
      mood,
      created_at: createdAt,
      title: "",
      user_id: userId,
    })
    .select("id, created_at, content, mood")
    .single();

  if (error || !data) {
    console.error("Zapis entries:", error);
    throw new ApiError(500, "Nie udało się zapisać wpisu.");
  }

  return {
    id: data.id,
    date: data.created_at,
    mood: data.mood as Mood,
    moodLabel: moodLabel(data.mood as Mood),
    moodInferred,
    text: stripHtml(data.content ?? ""),
  };
}

export interface DayResult {
  date: string;
  hasEntry: boolean;
  count: number;
  entries: { createdAt: string; mood: Mood; moodLabel: string; text: string }[];
}

/** Zwraca, co jest w danym dniu (domyślnie dziś). */
export async function getDayForUser(
  supabase: SupabaseClient,
  userId: string,
  date?: string,
): Promise<DayResult> {
  const day = date ?? todayWarsaw();
  if (!YMD.test(day)) {
    throw new ApiError(400, "Parametr 'date' musi mieć format YYYY-MM-DD.");
  }

  const all = await loadEntriesForUser(supabase, userId);
  const dayEntries = all.filter((e) => e.day === day);

  return {
    date: day,
    hasEntry: dayEntries.length > 0,
    count: dayEntries.length,
    entries: dayEntries.map((e) => ({
      createdAt: e.date,
      mood: e.mood as Mood,
      moodLabel: moodLabel(e.mood as Mood),
      text: e.text,
    })),
  };
}
