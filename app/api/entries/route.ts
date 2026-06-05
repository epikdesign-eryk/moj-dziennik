// Publiczne API wpisów dziennika (per użytkownik). Uwierzytelnianie: PAT
// (Authorization: Bearer mdz_pat_...) lub sesja cookie — patrz lib/supabase/api-auth.ts.
//
//  POST /api/entries  { text, date?, mood? }  → dodaje wpis (mood wnioskowany, gdy brak)
//  GET  /api/entries?date=YYYY-MM-DD          → co jest w danym dniu (domyślnie dziś)

import { NextResponse, type NextRequest } from "next/server";
import { getApiClient } from "@/lib/supabase/api-auth";
import {
  todayWarsaw,
  textToHtml,
  stripHtml,
  loadEntriesForUser,
} from "@/lib/journal-server";
import { inferMood } from "@/lib/mood-infer";
import { moodLabel } from "@/lib/journal-utils";
import type { Mood } from "@/types/journal";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function isValidMood(n: unknown): n is Mood {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
}

// --- POST: dodanie wpisu ----------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await getApiClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  let body: { text?: string; date?: string; mood?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Zły JSON." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Pole 'text' jest wymagane." }, { status: 400 });
  }

  const date = body.date ?? todayWarsaw();
  if (!YMD.test(date)) {
    return NextResponse.json(
      { error: "Pole 'date' musi mieć format YYYY-MM-DD." },
      { status: 400 },
    );
  }

  if (body.mood !== undefined && !isValidMood(body.mood)) {
    return NextResponse.json(
      { error: "Pole 'mood' musi być liczbą całkowitą 1–5." },
      { status: 400 },
    );
  }

  // Brak nastroju → wnioskujemy z treści (Grok, fallback 3).
  const moodInferred = body.mood === undefined;
  const mood: Mood = moodInferred ? await inferMood(text) : (body.mood as Mood);

  // created_at = dzień wpisu. Dla dziś bierzemy „teraz", dla innego dnia
  // południe UTC (ten sam dzień kalendarzowy w Europe/Warsaw).
  const createdAt =
    date === todayWarsaw() ? new Date().toISOString() : `${date}T12:00:00Z`;

  const { data, error } = await auth.supabase
    .from("entries")
    .insert({
      content: textToHtml(text),
      mood,
      created_at: createdAt,
      title: "",
      user_id: auth.userId,
    })
    .select("id, created_at, content, mood")
    .single();

  if (error || !data) {
    console.error("Zapis entries:", error);
    return NextResponse.json({ error: "Nie udało się zapisać wpisu." }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: data.id,
      date: data.created_at,
      mood: data.mood,
      moodLabel: moodLabel(data.mood as Mood),
      moodInferred,
      text: stripHtml(data.content ?? ""),
    },
    { status: 201 },
  );
}

// --- GET: odczyt dnia -------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await getApiClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date") ?? todayWarsaw();
  if (!YMD.test(date)) {
    return NextResponse.json(
      { error: "Parametr 'date' musi mieć format YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const all = await loadEntriesForUser(auth.supabase, auth.userId);
  const dayEntries = all.filter((e) => e.day === date);

  return NextResponse.json({
    date,
    hasEntry: dayEntries.length > 0,
    count: dayEntries.length,
    entries: dayEntries.map((e) => ({
      createdAt: e.date,
      mood: e.mood,
      moodLabel: moodLabel(e.mood as Mood),
      text: e.text,
    })),
  });
}
