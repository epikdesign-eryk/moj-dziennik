// Publiczne API wpisów dziennika (per użytkownik). Uwierzytelnianie: PAT
// (Authorization: Bearer mdz_pat_...) lub sesja cookie — patrz lib/supabase/api-auth.ts.
// Logika domenowa żyje w lib/journal-actions.ts (współdzielona z serwerem MCP).
//
//  POST /api/entries  { text, date?, mood? }  → dodaje wpis (mood wnioskowany, gdy brak)
//  GET  /api/entries?date=YYYY-MM-DD          → co jest w danym dniu (domyślnie dziś)

import { NextResponse, type NextRequest } from "next/server";
import { getApiClient } from "@/lib/supabase/api-auth";
import {
  createEntryForUser,
  getDayForUser,
  ApiError,
} from "@/lib/journal-actions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getApiClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  let body: { text?: string; date?: string; mood?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Zły JSON." }, { status: 400 });
  }

  try {
    const entry = await createEntryForUser(auth.supabase, auth.userId, body);
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function GET(request: NextRequest) {
  const auth = await getApiClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date") ?? undefined;

  try {
    const result = await getDayForUser(auth.supabase, auth.userId, date);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
