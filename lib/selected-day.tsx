"use client";

// Współdzielony stan „wybranego dnia" dla paska kalendarza.
// Trzymany w kontekście osadzonym w AppShell, więc panel boczny (desktop)
// i strona główna (mobile) widzą tę samą wartość, trwałą między nawigacjami.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toLocalYMD } from "@/lib/journal-utils";

interface SelectedDayValue {
  /** Klucz wybranego dnia `YYYY-MM-DD` lub "" do czasu zamontowania. */
  selectedDay: string;
  setSelectedDay: (ymd: string) => void;
  /** Dzisiejszy dzień `YYYY-MM-DD` (ustalany po stronie klienta). */
  today: string;
}

const SelectedDayContext = createContext<SelectedDayValue | null>(null);

export function SelectedDayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [today, setToday] = useState("");
  const [selectedDay, setSelectedDay] = useState("");

  // Po zamontowaniu ustaw dziś jako domyślny wybrany dzień (unika rozjazdu hydracji).
  useEffect(() => {
    const ymd = toLocalYMD(new Date());
    setToday(ymd);
    setSelectedDay(ymd);
  }, []);

  const value = useMemo(
    () => ({ selectedDay, setSelectedDay, today }),
    [selectedDay, today],
  );

  return (
    <SelectedDayContext.Provider value={value}>
      {children}
    </SelectedDayContext.Provider>
  );
}

export function useSelectedDay(): SelectedDayValue {
  const ctx = useContext(SelectedDayContext);
  if (!ctx) {
    throw new Error("useSelectedDay musi być użyte wewnątrz SelectedDayProvider");
  }
  return ctx;
}
