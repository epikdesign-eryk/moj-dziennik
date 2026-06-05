// Klient Supabase z kluczem service-role (sekret). Omija RLS, więc wolno go
// używać WYŁĄCZNIE po stronie serwera (route handlery) i zawsze ręcznie
// filtrować po `user_id`. Klucz `SUPABASE_SECRET_KEY` nigdy nie trafia do klienta.
//
// Używany do weryfikacji Personal Access Tokenów (PAT) i operacji w trybie PAT,
// gdzie żądanie nie ma sesji Supabase, więc `auth.uid()` jest niedostępne.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("Brak SUPABASE_SECRET_KEY w środowisku.");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
