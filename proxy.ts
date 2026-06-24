// Next.js 16: dawne `middleware.ts` to teraz `proxy.ts` (eksport funkcji `proxy`).
// Odświeża sesję Supabase przy każdym żądaniu i pilnuje dostępu do tras.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Wszystko poza zasobami statycznymi Next.js, plikami graficznymi oraz
    // ścieżką `ingest` (reverse proxy do PostHog — nie może być chroniona authem,
    // inaczej zdarzenia analityki są przekierowywane na /login).
    "/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
