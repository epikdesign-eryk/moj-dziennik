// Uwierzytelnianie żądań do publicznego API dziennika.
// Dwie ścieżki, jeden wynik `{ supabase, userId }`:
//   1. Personal Access Token: nagłówek `Authorization: Bearer mdz_pat_...`
//      → klient service-role + user_id z tabeli api_tokens (po haśle SHA-256).
//   2. Sesja przeglądarki (ciasteczka) → zwykły klient serwerowy + auth.getUser().
//
// Handlery ZAWSZE filtrują/wstawiają jawnie po zwróconym `userId`, więc kod jest
// identyczny w obu trybach (PAT omija RLS, więc jawny scope jest konieczny).

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const PAT_PREFIX = "mdz_pat_";

export interface ApiAuth {
  supabase: SupabaseClient;
  userId: string;
}

/** SHA-256 (hex) tokenu — to przechowujemy w bazie, nigdy plaintextu. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Sprawdza Personal Access Token i zwraca `user_id` właściciela (albo `null`).
 * Wspólne dla REST (getApiClient) i serwera MCP (verifyToken).
 */
export async function resolveUserIdFromToken(
  token: string,
): Promise<string | null> {
  if (!token.startsWith(PAT_PREFIX)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error || !data) return null;

  // Ostatnie użycie — best-effort, nie blokuje.
  void admin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.user_id as string;
}

/**
 * Zwraca uwierzytelnionego użytkownika i klienta Supabase, albo `null`.
 * `null` → handler powinien odpowiedzieć 401.
 */
export async function getApiClient(request: Request): Promise<ApiAuth | null> {
  const token = bearer(request);

  // --- Ścieżka PAT ---------------------------------------------------------
  if (token && token.startsWith(PAT_PREFIX)) {
    const userId = await resolveUserIdFromToken(token);
    if (!userId) return null;
    return { supabase: createAdminClient(), userId };
  }

  // --- Ścieżka sesji (ciasteczka) -----------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return { supabase: supabase as unknown as SupabaseClient, userId: user.id };
}
