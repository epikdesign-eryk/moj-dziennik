"use client";

// Hook spinający komponenty z warstwą danych (Supabase).
// Lista pochodzi ze współdzielonego store (useSyncExternalStore), więc wszyscy
// konsumenci (panel boczny + aktywna strona) widzą zawsze ten sam, aktualny stan.
// `loaded` ustawiane jest po pierwszym pobraniu danych, by uniknąć migotania.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { JournalEntryDraft } from "@/types/journal";
import * as storage from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export function useEntries() {
  const entries = useSyncExternalStore(
    storage.subscribe,
    storage.getSnapshot,
    storage.getServerSnapshot,
  );
  const [loaded, setLoaded] = useState(false);

  // Pobierz wpisy po zamontowaniu oraz reaguj na zmianę sesji
  // (logowanie/wylogowanie) — wtedy odświeżamy lub czyścimy listę.
  useEffect(() => {
    let active = true;

    storage.load().finally(() => {
      if (active) setLoaded(true);
    });

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        storage.clear();
      } else {
        storage.load();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => storage.load(), []);

  const createEntry = useCallback((draft: JournalEntryDraft) => {
    return storage.create(draft);
  }, []);

  const updateEntry = useCallback((id: string, draft: JournalEntryDraft) => {
    return storage.update(id, draft);
  }, []);

  const removeEntry = useCallback((id: string) => {
    return storage.remove(id);
  }, []);

  return { entries, loaded, refresh, createEntry, updateEntry, removeEntry };
}
