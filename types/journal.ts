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
   * Zdjęcie dołączone do wpisu — zarezerwowane na kolejny etap.
   * Na teraz zawsze `null` (UI ma jedynie nieaktywny placeholder).
   */
  image: string | null;
}

/** Dane formularza przy tworzeniu / edycji wpisu (bez pól generowanych). */
export interface JournalEntryDraft {
  content: string;
  mood: Mood;
  image: string | null;
}
