// Serwer MCP „Mój Dziennik" — pozwala agentom AI (Claude, Cursor, Claude Code) sterować
// dziennikiem natywnie, przez Model Context Protocol, zamiast ręcznych wywołań HTTP.
//
// Transport: Streamable HTTP pod /api/mcp. Uwierzytelnianie: ten sam Personal Access Token
// co w REST API (Authorization: Bearer mdz_pat_...), weryfikowany przez resolveUserIdFromToken.
// Logika domenowa współdzielona z REST (lib/journal-actions.ts, lib/therapist-run.ts).
//
// Uwaga routingowa: [transport] to segment dynamiczny obok statycznych /api/{entries,
// therapist,tokens,chat} — Next.js wybiera trasy statyczne przed dynamiczną, więc ten
// handler obsługuje wyłącznie /api/mcp.

import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { resolveUserIdFromToken } from "@/lib/supabase/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createEntryForUser,
  getDayForUser,
  ApiError,
} from "@/lib/journal-actions";
import { askTherapist } from "@/lib/therapist-run";
import { todayWarsaw } from "@/lib/journal-server";

export const maxDuration = 60;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Wyciąga user_id wstrzyknięty przez withMcpAuth (extra.authInfo.extra.userId). */
function userIdFrom(extra: { authInfo?: { extra?: Record<string, unknown> } }): string {
  const id = extra.authInfo?.extra?.userId;
  if (typeof id !== "string") throw new ApiError(401, "Brak autoryzacji.");
  return id;
}

/** Zamienia wynik akcji na odpowiedź narzędzia MCP (tekst czytelny + JSON). */
function ok(text: string, data: unknown) {
  return {
    content: [
      { type: "text" as const, text: `${text}\n\n${JSON.stringify(data, null, 2)}` },
    ],
  };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: `Błąd: ${message}` }], isError: true };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "add_journal_entry",
      {
        title: "Dodaj wpis do dziennika",
        description:
          "Dodaje nowy wpis do dziennika użytkownika. Domyślnie na dziś. Jeśli nie podasz nastroju (mood), zostanie wywnioskowany z treści (skala 1–5).",
        inputSchema: {
          text: z.string().describe("Treść wpisu."),
          date: z
            .string()
            .optional()
            .describe("Dzień wpisu w formacie YYYY-MM-DD (domyślnie dziś)."),
          mood: z
            .number()
            .int()
            .min(1)
            .max(5)
            .optional()
            .describe("Nastrój 1–5 (1=źle … 5=świetnie). Pominięty → wnioskowany."),
        },
      },
      async ({ text, date, mood }, extra) => {
        try {
          const userId = userIdFrom(extra);
          const entry = await createEntryForUser(createAdminClient(), userId, {
            text,
            date,
            mood,
          });
          return ok(
            `Dodano wpis na ${entry.date.slice(0, 10)} z nastrojem „${entry.moodLabel}" (${entry.mood}/5)${entry.moodInferred ? " — wywnioskowanym z treści" : ""}.`,
            entry,
          );
        } catch (err) {
          return fail(err instanceof ApiError ? err.message : "nieoczekiwany błąd.");
        }
      },
    );

    server.registerTool(
      "get_journal_day",
      {
        title: "Pokaż wpisy z dnia",
        description:
          "Zwraca wpisy z danego dnia (domyślnie dziś): czy istnieją, jaki nastrój i treść.",
        inputSchema: {
          date: z
            .string()
            .optional()
            .describe("Dzień w formacie YYYY-MM-DD (domyślnie dziś)."),
        },
      },
      async ({ date }, extra) => {
        try {
          const userId = userIdFrom(extra);
          const result = await getDayForUser(createAdminClient(), userId, date);
          return ok(
            result.hasEntry
              ? `Dzień ${result.date}: ${result.count} wpis(ów).`
              : `Dzień ${result.date}: brak wpisów.`,
            result,
          );
        } catch (err) {
          return fail(err instanceof ApiError ? err.message : "nieoczekiwany błąd.");
        }
      },
    );

    server.registerTool(
      "ask_therapist",
      {
        title: "Zapytaj psychoterapeutę AI",
        description:
          "Zadaje pytanie agentowi-psychoterapeucie, który odpowiada w kontekście wpisów z danego dnia (domyślnie dziś). Rozmowa jest zapisywana.",
        inputSchema: {
          question: z.string().describe("Pytanie do agenta."),
          date: z
            .string()
            .optional()
            .describe("Dzień kontekstu w formacie YYYY-MM-DD (domyślnie dziś)."),
        },
      },
      async ({ question, date }, extra) => {
        try {
          const userId = userIdFrom(extra);
          const day = date ?? todayWarsaw();
          if (!YMD.test(day)) {
            return fail("Pole 'date' musi mieć format YYYY-MM-DD.");
          }
          if (!question.trim()) return fail("Pole 'question' jest wymagane.");
          const answer = await askTherapist(
            createAdminClient(),
            userId,
            day,
            question.trim(),
          );
          return { content: [{ type: "text" as const, text: answer }] };
        } catch (err) {
          return fail(
            err instanceof ApiError ? err.message : "agent chwilowo niedostępny.",
          );
        }
      },
    );
  },
  { serverInfo: { name: "moj-dziennik", version: "1.0.0" } },
  { basePath: "/api", maxDuration: 60, disableSse: true },
);

// PAT (ten sam co w REST). Brak/zły token → 401.
const authHandler = withMcpAuth(
  handler,
  async (_req, bearer) => {
    if (!bearer?.startsWith("mdz_pat_")) return undefined;
    const userId = await resolveUserIdFromToken(bearer);
    return userId
      ? { token: bearer, scopes: [], clientId: userId, extra: { userId } }
      : undefined;
  },
  { required: true },
);

export { authHandler as GET, authHandler as POST };
