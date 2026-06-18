// Route handler rozmowy z agentem AI ("psychoterapeuta") — czat w aplikacji.
//  GET  /api/chat?day=YYYY-MM-DD  → historia wątku danego dnia
//  POST /api/chat { day, message } → wysłanie pytania, zwraca odpowiedź agenta
//
// Sesja z ciasteczek (RLS). Sam rdzeń rozmowy (kontekst + model + zapis) żyje w
// lib/therapist-run.ts i jest współdzielony z publicznym API (/api/therapist).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askTherapist } from "@/lib/therapist-run";
import { ApiError } from "@/lib/journal-actions";
import { resolveTherapistId, DEFAULT_THERAPIST_ID } from "@/lib/therapists";
import { isTherapistUnlocked } from "@/lib/therapist-access";

// Wymusza dynamiczne wykonanie (sesja z ciasteczek) — bez prerenderu.
export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// --- GET: historia wątku ----------------------------------------------------

export async function GET(request: NextRequest) {
  const day = request.nextUrl.searchParams.get("day") ?? "";
  if (!YMD.test(day)) {
    return NextResponse.json({ error: "Brak/zły parametr day." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("day", day)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Błąd odczytu." }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

// --- POST: nowa wiadomość ---------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { day?: string; message?: string; therapistId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Zły JSON." }, { status: 400 });
  }

  const day = body.day ?? "";
  const message = (body.message ?? "").trim();
  if (!YMD.test(day)) {
    return NextResponse.json({ error: "Brak/zły parametr day." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Pusta wiadomość." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  // Wybrana persona — gdy płatna i nieodblokowana, bezpieczny fallback do Robbinsa.
  let therapistId = resolveTherapistId(body.therapistId);
  if (
    therapistId !== DEFAULT_THERAPIST_ID &&
    !(await isTherapistUnlocked(supabase, user.id, therapistId))
  ) {
    therapistId = DEFAULT_THERAPIST_ID;
  }

  try {
    const reply = await askTherapist(supabase, user.id, day, message, therapistId);
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Grok error:", err);
    return NextResponse.json(
      { error: "Agent jest chwilowo niedostępny. Spróbuj ponownie." },
      { status: 502 },
    );
  }
}
