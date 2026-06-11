// Model danych pojedynczego wpisu dziennika (Etap 1 / MVP).

/** Skala nastroju: 1 = 😞 ... 5 = 😄 */
export type Mood = 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  /** Unikalny identyfikator (crypto.randomUUID()). */
  id: string;
  /** Data utworzenia w formacie ISO (ustawiana automatycznie). */
  date: string;
  /** Treść w formacie HTML (z edytora TipTap). Bez osobnego tytułu — ewentualne
   *  wyróżnienie robi użytkownik, pogrubiając pierwsze zdanie. */
  content: string;
  /** Wybrany nastrój. */
  mood: Mood;
  /**
   * Zdjęcia dołączone do wpisu — ścieżki obiektów w prywatnym buckecie
   * Storage `entry-images` (np. `"<uid>/ab12.jpg"`), nie gotowe URL-e.
   * Do wyświetlenia generujemy podpisane URL-e. Pusta lista = brak zdjęć.
   */
  images: string[];
}

/** Dane formularza przy tworzeniu / edycji wpisu (bez pól generowanych). */
export interface JournalEntryDraft {
  content: string;
  mood: Mood;
  images: string[];
}
