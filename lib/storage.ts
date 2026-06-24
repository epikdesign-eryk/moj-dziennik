// Warstwa trwałego zapisu wpisów — Supabase (Postgres + RLS).
// Wcześniej (Etap 1) dane żyły w localStorage; teraz każdy wpis należy do
// zalogowanego użytkownika i jest przechowywany w tabeli `entries`.
//
// Zachowujemy wzorzec współdzielonego store (subscribe/getSnapshot dla
// useSyncExternalStore), więc panel boczny i widok szczegółów widzą zawsze ten
// sam, aktualny stan. Zmieniło się źródło danych oraz to, że mutacje są async.

import type { JournalEntry, JournalEntryDraft } from "@/types/journal";
import { createClient } from "@/lib/supabase/client";
import { removeEntryImages } from "@/lib/entry-images";
import { track } from "@/lib/analytics";

const supabase = createClient();
const TABLE = "entries";

// Wiersz z bazy: `created_at` pełni rolę pola `date` w UI.
// Kolumna `title` istnieje w bazie (z Etapu 1), ale UI z niej zrezygnowało —
// nie czytamy jej, a przy zapisie wstawiamy "" (gdyby kolumna była NOT NULL).
type EntryRow = {
  id: string;
  created_at: string;
  content: string;
  mood: JournalEntry["mood"];
  images: string[] | null;
};

const SELECT = "id, created_at, content, mood, images";

function mapRow(row: EntryRow): JournalEntry {
  return {
    id: row.id,
    date: row.created_at,
    content: row.content,
    mood: row.mood,
    images: row.images ?? [],
  };
}

// --- Współdzielony store dla useSyncExternalStore ---------------------------

const listeners = new Set<() => void>();
const EMPTY: JournalEntry[] = [];
let cache: JournalEntry[] = EMPTY;

/** Powiadamia subskrybentów po każdej zmianie cache. */
function notify(): void {
  for (const listener of listeners) listener();
}

/** Subskrypcja zmian listy. Zwraca funkcję odsubskrybowania. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Aktualna migawka (stabilna referencja) dla klienta. */
export function getSnapshot(): JournalEntry[] {
  return cache;
}

/** Stabilna, pusta migawka dla SSR. */
export function getServerSnapshot(): JournalEntry[] {
  return EMPTY;
}

/** Pobiera wpisy zalogowanego użytkownika z bazy i aktualizuje cache. */
export async function load(): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    // Brak sesji / błąd — pokazujemy pustą listę zamiast wywracać aplikację.
    cache = EMPTY;
    notify();
    return;
  }

  cache = (data as EntryRow[]).map(mapRow);
  notify();
}

/** Czyści cache (np. po wylogowaniu). */
export function clear(): void {
  cache = EMPTY;
  notify();
}

/** Tworzy nowy wpis, zapisuje w bazie i zwraca go. */
export async function create(draft: JournalEntryDraft): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    // title="" — kolumna z Etapu 1 może być NOT NULL, a UI jej już nie używa.
    .insert({ ...draft, title: "" })
    .select(SELECT)
    .single();

  if (error) throw error;

  const entry = mapRow(data as EntryRow);
  track("entry_created", { mood: entry.mood, images: entry.images.length });
  cache = [entry, ...cache];
  notify();
  return entry;
}

/** Aktualizuje wpis. Zwraca zaktualizowany wpis lub `undefined`. */
export async function update(
  id: string,
  draft: JournalEntryDraft,
): Promise<JournalEntry | undefined> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...draft, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error || !data) return undefined;

  const entry = mapRow(data as EntryRow);
  cache = cache.map((e) => (e.id === id ? entry : e));
  notify();
  return entry;
}

/** Usuwa wpis o podanym id oraz powiązane pliki zdjęć z bucketa. */
export async function remove(id: string): Promise<void> {
  // Najpierw skasuj pliki (best-effort) — błąd sprzątania nie blokuje usunięcia.
  const paths = cache.find((e) => e.id === id)?.images ?? [];
  if (paths.length > 0) {
    try {
      await removeEntryImages(paths);
    } catch {
      /* ignore — pliki-sieroty można posprzątać później */
    }
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;

  cache = cache.filter((e) => e.id !== id);
  notify();
}
