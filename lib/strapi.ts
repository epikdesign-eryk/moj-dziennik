// Cienki klient REST Strapi v5 (źródło edycji wpisów).
// Używany przez /api/sync/from-supabase do propagacji zmian z Supabase do Strapi.
//
// Łącznik między systemami: Strapi `Entry.supabaseId` <-> Supabase `entries.id`.
// Po stronie Supabase trzymamy też `strapi_id` = Strapi `documentId` (v5).

const baseUrl = () => {
  const url = process.env.STRAPI_URL;
  if (!url) throw new Error("Brak STRAPI_URL w środowisku.");
  return url.replace(/\/$/, "");
};

const token = () => {
  const t = process.env.STRAPI_API_TOKEN;
  if (!t) throw new Error("Brak STRAPI_API_TOKEN w środowisku.");
  return t;
};

export interface StrapiEntryData {
  content: string; // czysty tekst
  mood: number; // 1–5
  images: string[]; // ścieżki obiektów w buckecie entry-images
  supabaseId: string; // = entries.id
  userEmail: string;
  entryDate: string; // ISO, lustro created_at
}

export interface StrapiEntry extends StrapiEntryData {
  documentId: string;
}

async function sfetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${baseUrl()}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

/** Normalizuje rekord Strapi (v5 — pola płaskie) do naszego kształtu. */
function mapStrapi(record: Record<string, unknown>): StrapiEntry {
  return {
    documentId: String(record.documentId),
    content: String(record.content ?? ""),
    mood: Number(record.mood ?? 3),
    images: Array.isArray(record.images) ? (record.images as string[]) : [],
    supabaseId: record.supabaseId ? String(record.supabaseId) : "",
    userEmail: record.userEmail ? String(record.userEmail) : "",
    entryDate: record.entryDate ? String(record.entryDate) : "",
  };
}

/** Szuka wpisu Strapi po `supabaseId`. Zwraca null, gdy brak. */
export async function findEntryBySupabaseId(
  supabaseId: string,
): Promise<StrapiEntry | null> {
  const qs = new URLSearchParams();
  qs.set("filters[supabaseId][$eq]", supabaseId);
  qs.set("pagination[pageSize]", "1");
  const res = await sfetch(`/entries?${qs.toString()}`);
  if (!res.ok) throw new Error(`Strapi find ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const item = json?.data?.[0];
  return item ? mapStrapi(item) : null;
}

export async function createEntry(data: StrapiEntryData): Promise<StrapiEntry> {
  const res = await sfetch(`/entries`, {
    method: "POST",
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`Strapi create ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return mapStrapi(json.data);
}

export async function updateEntry(
  documentId: string,
  data: Partial<StrapiEntryData>,
): Promise<StrapiEntry> {
  const res = await sfetch(`/entries/${documentId}`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`Strapi update ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return mapStrapi(json.data);
}

export async function deleteEntry(documentId: string): Promise<void> {
  const res = await sfetch(`/entries/${documentId}`, { method: "DELETE" });
  // 404 traktujemy jako sukces (już usunięty) — idempotencja.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Strapi delete ${res.status}: ${await res.text()}`);
  }
}
