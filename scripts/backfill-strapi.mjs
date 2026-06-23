// Backfill: kopiuje istniejące wpisy z Supabase (public.entries) do Strapi,
// ustanawiając łącznik w obie strony (entries.strapi_id <-> Entry.supabaseId).
// Idempotentny: pomija wpisy, które mają już strapi_id (chyba że --all).
//
// Uruchomienie:
//   node --env-file=.env.local scripts/backfill-strapi.mjs
//
// Wymagane zmienne (.env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, STRAPI_URL, STRAPI_API_TOKEN

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const STRAPI_URL = (process.env.STRAPI_URL || "").replace(/\/$/, "");
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

const recomputeAll = process.argv.includes("--all");

function requireEnv(name, value) {
  if (!value) {
    console.error(`Brak zmiennej środowiskowej ${name}. Ustaw ją w .env.local.`);
    process.exit(1);
  }
}
requireEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
requireEnv("SUPABASE_SECRET_KEY", SUPABASE_SECRET);
requireEnv("STRAPI_URL", STRAPI_URL);
requireEnv("STRAPI_API_TOKEN", STRAPI_TOKEN);

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** HTML wpisu -> czysty tekst (spójne ze stripHtml w apce). */
function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const emailCache = new Map();
async function emailForUserId(userId) {
  if (emailCache.has(userId)) return emailCache.get(userId);
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  const email = error || !data?.user ? null : data.user.email ?? null;
  emailCache.set(userId, email);
  return email;
}

async function strapiCreate(data) {
  const res = await fetch(`${STRAPI_URL}/api/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`Strapi create ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.documentId;
}

async function main() {
  let query = supabase
    .from("entries")
    .select("id, content, mood, images, created_at, user_id, strapi_id")
    .order("created_at", { ascending: true });
  if (!recomputeAll) query = query.is("strapi_id", null);

  const { data: rows, error } = await query;
  if (error) {
    console.error("Odczyt entries:", error);
    process.exit(1);
  }

  console.log(`Do przeniesienia: ${rows.length} wpisów`);
  let ok = 0;
  let skipped = 0;

  for (const r of rows) {
    const email = await emailForUserId(r.user_id);
    if (!email) {
      console.warn(`- pomijam ${r.id}: brak emaila dla user_id ${r.user_id}`);
      skipped++;
      continue;
    }
    try {
      const documentId = await strapiCreate({
        content: stripHtml(r.content),
        mood: r.mood,
        images: r.images ?? [],
        supabaseId: r.id,
        userEmail: email,
        entryDate: r.created_at,
      });
      const { error: upErr } = await supabase
        .from("entries")
        .update({ strapi_id: documentId })
        .eq("id", r.id);
      if (upErr) throw upErr;
      ok++;
      if (ok % 20 === 0) console.log(`  ...${ok}`);
    } catch (e) {
      console.error(`- błąd przy ${r.id}:`, e.message);
      skipped++;
    }
  }

  console.log(`Gotowe. Przeniesione: ${ok}, pominięte: ${skipped}.`);
}

main();
