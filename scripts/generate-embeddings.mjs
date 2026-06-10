// Generuje embeddingi (OpenAI text-embedding-3-small, 1536 wymiarów) dla każdego
// wpisu w tabeli `public.entries` i zapisuje je w kolumnie `embedding`.
// Jeden wpis = jeden wektor (bez chunkowania).
//
// Uruchomienie:
//   node --env-file=.env.local scripts/generate-embeddings.mjs
//
// Wymagane zmienne środowiskowe (.env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY
//
// Domyślnie pomija wpisy, które już mają embedding. Przekaż --all, aby
// przeliczyć wszystkie od nowa.

import { createClient } from "@supabase/supabase-js";

const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536;
const BATCH = 100; // ile wpisów wysłać w jednym żądaniu do OpenAI

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const recomputeAll = process.argv.includes("--all");

function requireEnv(name, value) {
  if (!value) {
    console.error(`Brak zmiennej środowiskowej ${name}. Ustaw ją w .env.local.`);
    process.exit(1);
  }
}
requireEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
requireEnv("SUPABASE_SECRET_KEY", SUPABASE_SECRET);
requireEnv("OPENAI_API_KEY", OPENAI_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Tekst, który embedujemy: tytuł + treść. Pusty wpis pomijamy.
function entryText({ title, content }) {
  return [title, content].filter(Boolean).join("\n\n").trim();
}

async function embedBatch(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts, dimensions: DIMENSIONS }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }
  const json = await res.json();
  // Zachowujemy kolejność wejścia (API zwraca posortowane po index).
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

async function main() {
  let query = supabase
    .from("entries")
    .select("id, title, content")
    .order("created_at", { ascending: true });
  if (!recomputeAll) query = query.is("embedding", null);

  const { data: rows, error } = await query;
  if (error) throw error;

  // Pomijamy całkiem puste wpisy (nie ma czego embedować).
  const todo = rows.filter((r) => entryText(r).length > 0);
  const skippedEmpty = rows.length - todo.length;

  console.log(
    `Wpisów do przetworzenia: ${todo.length}` +
      (skippedEmpty ? ` (pominięto ${skippedEmpty} pustych)` : "") +
      (recomputeAll ? " [--all: przeliczam wszystkie]" : " [tylko bez embeddingu]")
  );
  if (todo.length === 0) {
    console.log("Nic do zrobienia.");
    return;
  }

  let done = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const vectors = await embedBatch(chunk.map(entryText));

    // Zapis każdego wektora osobno (jeden wpis = jeden wektor).
    for (let j = 0; j < chunk.length; j++) {
      const { error: upErr } = await supabase
        .from("entries")
        .update({ embedding: vectors[j] })
        .eq("id", chunk[j].id);
      if (upErr) throw new Error(`Update ${chunk[j].id}: ${upErr.message}`);
      done++;
    }
    console.log(`  zapisano ${done}/${todo.length}`);
  }

  console.log(`Gotowe. Zaktualizowano ${done} wpisów.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
