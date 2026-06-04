// Next.js 16: dawne `middleware.ts` to teraz `proxy.ts` (eksport funkcji `proxy`).
// Odświeża sesję Supabase przy każdym żądaniu i pilnuje dostępu do tras.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Wszystko poza zasobami statycznymi Next.js i typowymi plikami graficznymi.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
