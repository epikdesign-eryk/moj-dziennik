// Odświeżanie sesji Supabase + ochrona tras, wołane z proxy.ts (Next.js 16).
// Wzorzec z poradnika @supabase/ssr dla middleware, zaadaptowany do `proxy`.
//
// WAŻNE: nie wstawiać żadnej logiki między createServerClient a getClaims() —
// łatwo wtedy o trudny do wykrycia bug z losowym wylogowywaniem użytkowników.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Ścieżki dostępne bez zalogowania.
const PUBLIC_PATHS = ["/login", "/docs", "/api/stripe/webhook"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Odśwież token (musi nastąpić tuż po utworzeniu klienta).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  // Trasy API same pilnują autoryzacji (PAT lub cookie) i zwracają JSON 401 —
  // nie przekierowujemy ich na /login, żeby nie psuć kontraktu API.
  const isApi = pathname.startsWith("/api");

  // Brak sesji na chronionej trasie → na /login.
  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Zalogowany użytkownik na /login → na stronę główną.
  // (Dotyczy tylko ekranu logowania — /docs zostaje dostępne także po zalogowaniu.)
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
