// Rdzeń rozmowy z agentem "psychoterapeutą", współdzielony przez:
//  - app/api/chat/route.ts   (czat w aplikacji, sesja cookie),
//  - app/api/therapist/route.ts (publiczne API, PAT lub cookie).
//
// Wykonuje: wczytanie historii wątku dnia + wpisów (kontekst) → złożenie promptu
// → pętlę z narzędziami (function calling) → ZAPIS obu wiadomości → zwrot odpowiedzi.
// Wszystkie zapytania jawnie filtrują/wstawiają po `userId` (działa w trybie PAT i cookie).

import type { SupabaseClient } from "@supabase/supabase-js";
import { grokChat, type ChatMessage } from "@/lib/grok";
import {
  SYSTEM_PROMPT,
  CRISIS_PROMPT,
  TOOLS,
  buildFocusedContext,
  detectsCrisis,
  runTool,
  hasToolCalls,
} from "@/lib/therapist";
import { loadEntriesForUser } from "@/lib/journal-server";

const MAX_TOOL_ROUNDS = 4;

/**
 * Zadaje pytanie agentowi w kontekście dnia `day` (YYYY-MM-DD) i zwraca odpowiedź.
 * Zapisuje wiadomość użytkownika i odpowiedź do `chat_messages`.
 * Rzuca wyjątkiem przy błędzie modelu (caller mapuje na 502).
 */
export async function askTherapist(
  supabase: SupabaseClient,
  userId: string,
  day: string,
  message: string,
): Promise<string> {
  // 1. Historia wątku tego dnia + wpisy użytkownika (kontekst).
  const [{ data: history }, entries] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("day", day)
      .order("created_at", { ascending: true }),
    loadEntriesForUser(supabase, userId),
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
  let reply = "";
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

  if (!reply) reply = "Przepraszam, nie udało mi się teraz odpowiedzieć.";

  // 4. Zapis obu wiadomości z jawnym user_id (działa też w trybie PAT/service-role).
  const { error: insertErr } = await supabase.from("chat_messages").insert([
    { day, role: "user", content: message, user_id: userId },
    { day, role: "assistant", content: reply, user_id: userId },
  ]);
  if (insertErr) {
    console.error("Zapis chat_messages:", insertErr);
  }

  return reply;
}
