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
  buildRetrievedContext,
  detectsCrisis,
  runTool,
  hasToolCalls,
} from "@/lib/therapist";
import { loadEntriesForUser } from "@/lib/journal-server";
import { hybridSearchEntries } from "@/lib/hybrid-search";
import { ApiError } from "@/lib/journal-actions";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_TOOL_ROUNDS = 4;

// Limit wywołań AI per użytkownik (płatny model + embeddingi). Wspólny dla
// czatu w aplikacji, publicznego API i MCP — wszystkie idą przez askTherapist.
const RL_PER_MINUTE = 6;
const RL_PER_DAY = 80;

/**
 * Sprawdza limit zapytań AI dla użytkownika (atomowo, w bazie). Po przekroczeniu
 * rzuca ApiError(429), zanim wykonamy jakiekolwiek płatne wywołanie modelu.
 *
 * Licznik wołamy ZAWSZE przez service-role (createAdminClient) — funkcja RPC nie
 * jest dostępna roli `authenticated`, więc zalogowany user nie wywoła jej sam z
 * cudzym user_id. Działa identycznie dla ścieżki cookie i PAT/MCP.
 */
export async function enforceAiRateLimit(userId: string): Promise<void> {
  const { data, error } = await createAdminClient().rpc("check_ai_rate_limit", {
    p_user_id: userId,
    p_max_per_min: RL_PER_MINUTE,
    p_max_per_day: RL_PER_DAY,
  });

  // Fail-open: błąd limitera nie może zablokować legalnego ruchu.
  if (error) {
    console.error("check_ai_rate_limit:", error);
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row && row.allowed === false) {
    const wait = Math.max(1, Number(row.retry_after) || 60);
    throw new ApiError(
      429,
      `Za dużo zapytań do agenta. Spróbuj ponownie za ${wait} s.`,
    );
  }
}

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
  // 0. Limit zapytań AI — zanim cokolwiek zapłacimy (model + embeddingi).
  await enforceAiRateLimit(userId);

  // 1. Historia wątku tego dnia + wpisy użytkownika (kontekst) + RAG: zawsze
  //    najpierw przeszukujemy bazę hybrydowo pytaniem użytkownika i pobieramy
  //    najtrafniejsze wpisy, by odpowiedź opierała się na nich (wzorzec RAG).
  const [{ data: history }, entries, retrieved] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("day", day)
      .order("created_at", { ascending: true }),
    loadEntriesForUser(supabase, userId),
    hybridSearchEntries(supabase, userId, message),
  ]);

  // 2. Złóż wiadomości dla modelu: stały kontekst ostatnich dni + pobrane wpisy (RAG).
  const crisis = detectsCrisis(message);
  const systemContent =
    SYSTEM_PROMPT +
    (crisis ? `\n\n${CRISIS_PROMPT}` : "") +
    `\n\n${buildFocusedContext(day, entries)}` +
    `\n\n${buildRetrievedContext(retrieved)}`;

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
          content: await runTool(call, { entries, supabase, userId }),
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
