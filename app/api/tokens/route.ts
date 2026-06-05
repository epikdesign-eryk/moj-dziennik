// Zarządzanie Personal Access Tokenami (PAT) — TYLKO dla zalogowanego użytkownika
// (sesja cookie). Panel na /docs woła te trasy.
//
//  POST   /api/tokens { name? }  → generuje token (plaintext zwracany RAZ)
//  GET    /api/tokens            → lista tokenów (bez hashy)
//  DELETE /api/tokens?id=...     → odwołuje token

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAT_PREFIX, hashToken } from "@/lib/supabase/api-auth";

export const dynamic = "force-dynamic";

/** Nowy token: prefiks + 32 losowe bajty (base64url). */
function generateToken(): string {
  return PAT_PREFIX + randomBytes(32).toString("base64url");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Pusty/zły body jest OK — nazwa jest opcjonalna.
  }
  const name = (body.name ?? "").trim() || null;

  const token = generateToken();
  const prefix = token.slice(0, PAT_PREFIX.length + 4); // np. "mdz_pat_AbCd"

  const { data, error } = await supabase
    .from("api_tokens")
    .insert({ name, token_hash: hashToken(token), prefix })
    .select("id, name, prefix, created_at")
    .single();

  if (error || !data) {
    console.error("Zapis api_tokens:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć tokenu." },
      { status: 500 },
    );
  }

  // Plaintext tokenu zwracamy TYLKO teraz — nie da się go odzyskać później.
  return NextResponse.json(
    {
      token,
      id: data.id,
      name: data.name,
      prefix: data.prefix,
      created_at: data.created_at,
    },
    { status: 201 },
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, name, prefix, created_at, last_used_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Błąd odczytu." }, { status: 500 });
  }

  return NextResponse.json({ tokens: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Brak parametru id." }, { status: 400 });
  }

  // RLS pilnuje, że usuwamy wyłącznie własny token.
  const { error } = await supabase.from("api_tokens").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Nie udało się odwołać tokenu." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
