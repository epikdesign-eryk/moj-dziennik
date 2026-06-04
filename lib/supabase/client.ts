// Klient Supabase dla komponentów działających w przeglądarce ("use client").
// Sesja jest trzymana w ciasteczkach (zarządza nimi @supabase/ssr), dzięki czemu
// jest współdzielona z serwerem (proxy.ts, Server Components).

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
