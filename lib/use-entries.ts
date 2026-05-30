"use client";

// Hook spinający komponenty z warstwą localStorage.
// Dane wczytywane są po zamontowaniu (useEffect), by uniknąć rozjazdu
// między renderem serwerowym a klientem (hydration mismatch).

import { useCallback, useEffect, useState } from "react";
import type { JournalEntry, JournalEntryDraft } from "@/types/journal";
import * as storage from "@/lib/storage";

export function useEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setEntries(storage.getAll());
  }, []);

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, [refresh]);

  const createEntry = useCallback((draft: JournalEntryDraft) => {
    const entry = storage.create(draft);
    setEntries(storage.getAll());
    return entry;
  }, []);

  const updateEntry = useCallback((id: string, draft: JournalEntryDraft) => {
    const entry = storage.update(id, draft);
    setEntries(storage.getAll());
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    storage.remove(id);
    setEntries(storage.getAll());
  }, []);

  return { entries, loaded, refresh, createEntry, updateEntry, removeEntry };
}
