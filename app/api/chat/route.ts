// Route handler rozmowy z agentem AI ("psychoterapeuta").
//  GET  /api/chat?day=YYYY-MM-DD  → historia wątku danego dnia
//  POST /api/chat { day, message } → wysłanie pytania, zwraca odpowiedź agenta
//
// Cały dostęp do danych idzie przez serwerowy klient Supabase z sesją
// użytkownika, więc RLS gwarantuje, że agent widzi wyłącznie wpisy tej osoby.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { grokChat, type ChatMessage } from "@/lib/grok";
import {
  SYSTEM_PROMPT,
  CRISIS_PROMPT,
  TOOLS,
  buildFocusedContext,
  detectsCrisis,
  runTool,
  hasToolCalls,
  type EntryForAgent,
} from "@/lib/therapist";

// Wymusza dynamiczne wykonanie (sesja z ciasteczek) — bez prerenderu.
export const dynamic = "force-dynamic";

const MAX_TOOL_ROUNDS = 4;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Lokalny dzień (Europe/Warsaw) z daty ISO — spójny z tym, co widzi UI,
// niezależnie od strefy czasowej serwera. en-CA daje format YYYY-MM-DD.
const warsawYMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Zamienia HTML wpisu (z TipTap) na czysty tekst dla modelu. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

type EntryRow = { created_at: string; content: string; mood: number };

/** Pobiera wszystkie wpisy zalogowanego użytkownika w formie dla agenta. */
async function loadEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<EntryForAgent[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("created_at, content, mood")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as EntryRow[]).map((r) => ({
    day: warsawYMD.format(new Date(r.created_at)),
    date: r.created_at,
    mood: r.mood,
    text: stripHtml(r.content ?? ""),
  }));
}

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
  let body: { day?: string; message?: string };
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

  // 1. Historia wątku tego dnia + wpisy użytkownika (kontekst).
  const [{ data: history }, entries] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("day", day)
      .order("created_at", { ascending: true }),
    loadEntries(supabase),
  ]);

  // 2. Złóż wiadomości dla modelu.
  const crisis = detectsCrisis(message);
  const systemContent =
    SYSTEM_PROMPT +
    (crisis ? `\n\n${CRISIS_PROMPT}` : "") +
    `\n\n${buildFocusedContext(day, entries)}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...((history ?? []) as { role: "user" | "assistant"; content: string }[]).map(
      (m) => ({ role: m.role, content: m.content }),
    ),
    { role: "user", content: message },
  ];

  // 3. Pętla z narzędziami: model może poprosić o dane, my je zwracamy.
  let reply: string;
  try {
    let rounds = 0;
    while (true) {
      const assistant = await grokChat({ messages, tools: TOOLS });

      if (hasToolCalls(assistant) && rounds < MAX_TOOL_ROUNDS) {
        rounds += 1;
        messages.push(assistant);
        for (const call of assistant.tool_calls) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: runTool(call, entries),
          });
        }
        continue;
      }

      reply = (assistant.content ?? "").trim();
      break;
    }
  } catch (err) {
    console.error("Grok error:", err);
    return NextResponse.json(
      { error: "Agent jest chwilowo niedostępny. Spróbuj ponownie." },
      { status: 502 },
    );
  }

  if (!reply) reply = "Przepraszam, nie udało mi się teraz odpowiedzieć.";

  // 4. Zapis obu wiadomości (user_id z auth.uid() w defaults + RLS).
  const { error: insertErr } = await supabase.from("chat_messages").insert([
    { day, role: "user", content: message },
    { day, role: "assistant", content: reply },
  ]);
  if (insertErr) {
    console.error("Zapis chat_messages:", insertErr);
  }

  return NextResponse.json({ reply });
}
