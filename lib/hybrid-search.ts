// Wyszukiwanie hybrydowe wpisów dziennika: search wektorowy (semantyka, pgvector <=>)
// + klasyczny full-text Postgresa, scalone w Postgresie przez RRF (funkcja RPC
// match_entries_hybrid). Używane przez narzędzie search_entries agenta-terapeuty,
// żeby przywoływał najtrafniejsze wpisy do zapytania (znaczeniowo, nie tylko dosłownie).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntryForAgent } from "@/lib/therapist";
import { embedText } from "@/lib/embeddings";
import { warsawYMD, stripHtml } from "@/lib/journal-server";

type HybridRow = {
  id: string;
  created_at: string;
  content: string;
  mood: number;
  score: number;
};

/**
 * Zwraca najtrafniejsze wpisy użytkownika dla `query` (hybryda wektor + full-text).
 * Jawny filtr po `userId` realizuje funkcja RPC (działa w trybie cookie/RLS i PAT).
 * Przy błędzie (np. brak klucza OpenAI, problem z RPC) zwraca [] — pętla narzędzi
 * agenta nie może się przez to wywalić.
 */
export async function hybridSearchEntries(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  matchCount = 30,
): Promise<EntryForAgent[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const queryEmbedding = await embedText(q);

    const { data, error } = await supabase.rpc("match_entries_hybrid", {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_query_text: q,
      p_match_count: matchCount,
    });

    if (error || !data) {
      if (error) console.error("match_entries_hybrid:", error);
      return [];
    }

    return (data as HybridRow[]).map((r) => ({
      day: warsawYMD.format(new Date(r.created_at)),
      date: r.created_at,
      mood: r.mood,
      text: stripHtml(r.content ?? ""),
    }));
  } catch (err) {
    console.error("hybridSearchEntries:", err);
    return [];
  }
}
