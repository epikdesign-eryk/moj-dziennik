// Warstwa trwałego zapisu wpisów w localStorage przeglądarki.
// Brak backendu (Etap 1) — wszystkie dane żyją lokalnie u użytkownika.

import type { JournalEntry, JournalEntryDraft } from "@/types/journal";

const STORAGE_KEY = "moj-dziennik:entries";

/** Czy mamy dostęp do localStorage (zabezpieczenie przed SSR). */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRaw(): JournalEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JournalEntry[]) : [];
  } catch {
    // Uszkodzone dane — nie wywracamy aplikacji.
    return [];
  }
}

function writeRaw(entries: JournalEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Wszystkie wpisy, posortowane od najnowszego do najstarszego. */
export function getAll(): JournalEntry[] {
  return readRaw().sort((a, b) => b.date.localeCompare(a.date));
}

/** Pojedynczy wpis po id (lub `undefined`). */
export function getById(id: string): JournalEntry | undefined {
  return readRaw().find((e) => e.id === id);
}

/** Tworzy nowy wpis, zapisuje i zwraca go. */
export function create(draft: JournalEntryDraft): JournalEntry {
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ...draft,
  };
  const entries = readRaw();
  entries.push(entry);
  writeRaw(entries);
  return entry;
}

/** Aktualizuje istniejący wpis. Zwraca zaktualizowany wpis lub `undefined`. */
export function update(id: string, draft: JournalEntryDraft): JournalEntry | undefined {
  const entries = readRaw();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  entries[idx] = { ...entries[idx], ...draft };
  writeRaw(entries);
  return entries[idx];
}

/** Usuwa wpis o podanym id. */
export function remove(id: string): void {
  writeRaw(readRaw().filter((e) => e.id !== id));
}
