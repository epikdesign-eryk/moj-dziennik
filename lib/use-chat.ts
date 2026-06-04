"use client";

// Hook zarządzający rozmową z agentem AI dla JEDNEGO dnia.
// Wątek jest per dzień (`YYYY-MM-DD`); zmiana dnia przełącza widoczną rozmowę.
// Historia ładowana leniwie — dopiero gdy panel zostanie otwarty dla danego dnia.

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  /** Lokalny znacznik wiadomości czekającej na odpowiedź agenta. */
  pending?: boolean;
}

export function useChat(day: string) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dni, dla których historia została już pobrana (by nie pobierać wielokrotnie).
  const loadedDays = useRef<Set<string>>(new Set());

  // Po zmianie dnia pokaż jego wątek (jeśli już pobrany), w innym razie wyczyść.
  useEffect(() => {
    setError(null);
    if (!day || !loadedDays.current.has(day)) {
      setMessages([]);
    }
  }, [day]);

  // Leniwe pobranie historii: gdy panel otwarty, a dzień nie był jeszcze ładowany.
  useEffect(() => {
    if (!open || !day || loadedDays.current.has(day)) return;
    let active = true;
    fetch(`/api/chat?day=${day}`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data: { messages?: { role: ChatMsg["role"]; content: string }[] }) => {
        if (!active) return;
        loadedDays.current.add(day);
        setMessages(
          (data.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, day]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending || !day) return;

      setOpen(true);
      setError(null);
      setSending(true);
      loadedDays.current.add(day); // od teraz wątek jest „świeży" lokalnie
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: "", pending: true },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day, message }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          reply?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Błąd odpowiedzi.");

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: data.reply ?? "",
          };
          return next;
        });
      } catch (err) {
        setMessages((prev) => prev.slice(0, -1)); // usuń placeholder asystenta
        setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
      } finally {
        setSending(false);
      }
    },
    [day, sending],
  );

  return { open, setOpen, messages, sending, error, send };
}
