// Jednorazowy seed: rozmieszcza przykładowe zdjęcia z folderu images-generated
// losowo po dniach konta test123@gmail.com i tworzy dzisiejszy wpis (tylko zdjęcie
// + nastrój, bez tekstu). Uruchamiać raz: node scripts/seed-images.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

// Sekrety czytamy z .env.local w czasie działania — nie zapisujemy ich w kodzie.
const env = Object.fromEntries(
  readFileSync(path.resolve(".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
const USER_ID = "f9cb0f04-0176-429e-a5a0-cdca350d5ecb"; // test123@gmail.com
const BUCKET = "entry-images";
const TODAY = "2026-06-11";

const db = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Wczytaj źródłowe obrazy do pamięci.
const dir = path.resolve("images-generated");
const sources = readdirSync(dir)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .map((f) => ({ name: f, bytes: readFileSync(path.join(dir, f)) }));
console.log(`Źródłowe obrazy: ${sources.length}`, sources.map((s) => s.name));

const warsawDate = (iso) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Wgrywa unikalną kopię losowego źródła i zwraca ścieżkę obiektu.
async function uploadCopy() {
  const src = pick(sources);
  const ext = src.name.split(".").pop().toLowerCase();
  const objPath = `${USER_ID}/${randomUUID()}.${ext}`;
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const { error } = await db.storage.from(BUCKET).upload(objPath, src.bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return objPath;
}

async function main() {
  // 1) Pobierz wpisy, zgrupuj po dniu (Europe/Warsaw), wybierz reprezentanta dnia
  //    (najpóźniejszy wpis tego dnia).
  const { data: entries, error } = await db
    .from("entries")
    .select("id, created_at, images")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const repByDay = new Map();
  for (const e of entries) {
    const day = warsawDate(e.created_at);
    if (!repByDay.has(day)) repByDay.set(day, e); // pierwszy = najpóźniejszy (desc)
  }
  console.log(`Dni: ${repByDay.size}, wpisów: ${entries.length}`);

  // 2) Losowy rozkład liczby zdjęć na dzień (sporo dni bez zdjęć).
  let touched = 0;
  let uploaded = 0;
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const [day, entry] of repByDay) {
    const r = Math.random();
    const count = r < 0.5 ? 0 : r < 0.72 ? 1 : r < 0.9 ? 2 : 3;
    dist[count]++;
    if (count === 0) continue;
    const paths = [];
    for (let i = 0; i < count; i++) paths.push(await uploadCopy());
    uploaded += paths.length;
    const { error: upErr } = await db
      .from("entries")
      .update({ images: paths, updated_at: new Date().toISOString() })
      .eq("id", entry.id);
    if (upErr) throw upErr;
    touched++;
  }
  console.log("Rozkład dni wg liczby zdjęć:", dist);
  console.log(`Zaktualizowano dni: ${touched}, wgrano plików: ${uploaded}`);

  // 3) Dzisiejszy wpis (11 cze) — bez tekstu, samo zdjęcie + nastrój.
  const todayPath = await uploadCopy();
  const mood = 4;
  const { data: created, error: insErr } = await db
    .from("entries")
    .insert({
      user_id: USER_ID,
      title: "",
      content: "",
      mood,
      images: [todayPath],
      created_at: `${TODAY}T12:00:00Z`,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  console.log(`Dzisiejszy wpis utworzony: ${created.id} (mood ${mood}, 1 zdjęcie)`);
}

main().then(() => {
  console.log("OK");
  process.exit(0);
}).catch((e) => {
  console.error("BŁĄD:", e);
  process.exit(1);
});
