// Publiczne API pytań do agenta "psychoterapeuty" (per użytkownik).
// Uwierzytelnianie: PAT (Authorization: Bearer mdz_pat_...) lub sesja cookie.
//
//  POST /api/therapist { question, date? } → { answer }
// Domyślnie pytanie w kontekście dzisiejszego dnia; rozmowa jest zapisywana
// (chat_messages), więc pojawia się też w panelu czatu w aplikacji.

import { NextResponse, type NextRequest } from "next/server";
import { getApiClient } from "@/lib/supabase/api-auth";
import { askTherapist } from "@/lib/therapist-run";
import { todayWarsaw } from "@/lib/journal-server";
import { ApiError } from "@/lib/journal-actions";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const auth = await getApiClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  let body: { question?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Zły JSON." }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json(
      { error: "Pole 'question' jest wymagane." },
      { status: 400 },
    );
  }

  const date = body.date ?? todayWarsaw();
  if (!YMD.test(date)) {
    return NextResponse.json(
      { error: "Pole 'date' musi mieć format YYYY-MM-DD." },
      { status: 400 },
    );
  }

  try {
    const answer = await askTherapist(auth.supabase, auth.userId, date, question);
    return NextResponse.json({ answer });
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
