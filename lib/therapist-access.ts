// Sprawdzanie, czy użytkownik ma dostęp do danej persony.
// Robbins (free) jest zawsze dostępny; płatne persony wymagają wiersza w
// `therapist_unlocks`. Filtr jawny po user_id — działa w trybie cookie i service-role.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getTherapist } from "@/lib/therapists";
import { createAdminClient } from "@/lib/supabase/admin";

/** Czy persona jest odblokowana dla użytkownika (darmowa → zawsze tak). */
export async function isTherapistUnlocked(
  supabase: SupabaseClient,
  userId: string,
  therapistId: string,
): Promise<boolean> {
  const therapist = getTherapist(therapistId);
  if (!therapist) return false;
  if (therapist.free) return true;

  const { data, error } = await supabase
    .from("therapist_unlocks")
    .select("therapist_id")
    .eq("user_id", userId)
    .eq("therapist_id", therapistId)
    .maybeSingle();

  if (error) {
    console.error("isTherapistUnlocked:", error);
    return false;
  }
  return data != null;
}

/** Zwraca zbiór id person odblokowanych dla użytkownika (bez darmowych). */
export async function listUnlockedTherapistIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("therapist_unlocks")
    .select("therapist_id")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map((r) => r.therapist_id as string);
}

/**
 * Zapisuje odblokowanie persony (po opłaceniu). Idempotentne: upsert po
 * (user_id, therapist_id), więc webhook i weryfikacja-na-powrocie nie zdublują.
 * Zawsze przez service-role (webhook nie ma sesji; tabela nie ma policy INSERT).
 */
export async function recordTherapistUnlock(
  userId: string,
  therapistId: string,
  stripeSessionId: string | null,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("therapist_unlocks")
    .upsert(
      {
        user_id: userId,
        therapist_id: therapistId,
        stripe_session_id: stripeSessionId,
      },
      { onConflict: "user_id,therapist_id" },
    );
  if (error) {
    console.error("recordTherapistUnlock:", error);
    throw error;
  }
}
