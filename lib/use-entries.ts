"use client";

// Hook spinający komponenty z warstwą localStorage.
// Lista pochodzi ze współdzielonego store (useSyncExternalStore), więc wszyscy
// konsumenci (panel boczny + aktywna strona) widzą zawsze ten sam, aktualny stan.
// `loaded` ustawiane jest po zamontowaniu, by uniknąć rozjazdu hydracji
// (SSR zwraca pustą migawkę).

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { JournalEntryDraft } from "@/types/journal";
import * as storage from "@/lib/storage";

export function useEntries() {
  const entries = useSyncExternalStore(
    storage.subscribe,
    storage.getSnapshot,
    storage.getServerSnapshot,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  // Mutacje zapisują do localStorage; odświeżenie konsumentów robi notify().
  const refresh = useCallback(() => {
    storage.notify();
  }, []);

  const createEntry = useCallback((draft: JournalEntryDraft) => {
    return storage.create(draft);
  }, []);

  const updateEntry = useCallback((id: string, draft: JournalEntryDraft) => {
    return storage.update(id, draft);
  }, []);

  const removeEntry = useCallback((id: string) => {
    storage.remove(id);
  }, []);

  return { entries, loaded, refresh, createEntry, updateEntry, removeEntry };
}
