"use client";

// Współdzielony stan „aktywnej persony" (z kim rozmawiamy na pasku AI).
// - activeId trwały w localStorage (domyślnie Robbins),
// - unlocked: zbiór id person dostępnych dla usera (z /api/therapists),
// - aktywna persona zawsze sprowadzana do dostępnej (gdyby zapis był nieaktualny).
// Wzorzec jak lib/selected-day.tsx — kontekst osadzony w AppShell.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  THERAPISTS,
  DEFAULT_THERAPIST_ID,
  getTherapist,
  type Therapist,
} from "@/lib/therapists";

const STORAGE_KEY = "activeTherapistId";

interface ActiveTherapistValue {
  /** Pełny katalog person (statyczny). */
  catalog: Therapist[];
  /** Aktualnie wybrana persona. */
  active: Therapist;
  /** Id person odblokowanych dla usera (z darmowymi). */
  unlocked: Set<string>;
  /** Czy lista odblokowanych została już pobrana. */
  loaded: boolean;
  /** Ustawia aktywną personę (tylko jeśli odblokowana). */
  setActive: (id: string) => void;
  /** Oznacza personę jako odblokowaną i ustawia ją aktywną (po opłaceniu). */
  markUnlocked: (id: string) => void;
  /** Ponawia pobranie statusu odblokowania (np. po powrocie z płatności). */
  refresh: () => void;
}

const ActiveTherapistContext = createContext<ActiveTherapistValue | null>(null);

export function ActiveTherapistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState(DEFAULT_THERAPIST_ID);
  const [unlocked, setUnlocked] = useState<Set<string>>(
    () => new Set(THERAPISTS.filter((t) => t.free).map((t) => t.id)),
  );
  const [loaded, setLoaded] = useState(false);

  // Odczyt zapamiętanej persony po zamontowaniu (unika rozjazdu hydracji).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && getTherapist(saved)) setActiveId(saved);
  }, []);

  const refresh = useCallback(() => {
    let active = true;
    fetch("/api/therapists")
      .then((r) => (r.ok ? r.json() : { therapists: [] }))
      .then((data: { therapists?: { id: string; unlocked: boolean }[] }) => {
        if (!active) return;
        const ids = (data.therapists ?? [])
          .filter((t) => t.unlocked)
          .map((t) => t.id);
        setUnlocked(new Set([...ids, DEFAULT_THERAPIST_ID]));
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return refresh();
  }, [refresh]);

  // Gdyby zapamiętana persona okazała się niedostępna — wróć do domyślnej.
  useEffect(() => {
    if (loaded && !unlocked.has(activeId)) {
      setActiveId(DEFAULT_THERAPIST_ID);
    }
  }, [loaded, unlocked, activeId]);

  const setActive = useCallback(
    (id: string) => {
      if (!unlocked.has(id) || !getTherapist(id)) return;
      setActiveId(id);
      localStorage.setItem(STORAGE_KEY, id);
    },
    [unlocked],
  );

  // Po potwierdzeniu zakupu: dopisz personę do odblokowanych i ustaw aktywną
  // od razu (zanim refresh dociągnie prawdę z /api/therapists), bez wyścigu.
  const markUnlocked = useCallback((id: string) => {
    if (!getTherapist(id)) return;
    setUnlocked((prev) => new Set(prev).add(id));
    setActiveId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo<ActiveTherapistValue>(
    () => ({
      catalog: THERAPISTS,
      active: getTherapist(activeId) ?? THERAPISTS[0],
      unlocked,
      loaded,
      setActive,
      markUnlocked,
      refresh,
    }),
    [activeId, unlocked, loaded, setActive, markUnlocked, refresh],
  );

  return (
    <ActiveTherapistContext.Provider value={value}>
      {children}
    </ActiveTherapistContext.Provider>
  );
}

export function useActiveTherapist(): ActiveTherapistValue {
  const ctx = useContext(ActiveTherapistContext);
  if (!ctx) {
    throw new Error(
      "useActiveTherapist musi być użyte wewnątrz ActiveTherapistProvider",
    );
  }
  return ctx;
}
