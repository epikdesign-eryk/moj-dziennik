"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { Paperclip, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelectedDay } from "@/lib/selected-day";
import { useChat } from "@/lib/use-chat";
import { ChatPanel } from "@/components/chat-panel";

// Maks. liczba wierszy zanim włączymy scroll w polu.
const MAX_ROWS = 4;
const LINE_HEIGHT = 20; // px (text-sm / leading-5)

// Trasy, na których pasek AI jest ukryty (np. formularz dodawania ma własny
// dolny pasek akcji, a ekran logowania nie ma powłoki).
const HIDDEN_PATHS = ["/new", "/login"];

/**
 * Dolny pasek rozmowy z agentem AI (persona: Anthony Robbins).
 * Wysłanie pytania rozwija panel rozmowy NAD paskiem; wątek jest per dzień
 * (na podstawie aktualnie wybranego dnia). NIE służy do zapisywania notatek.
 */
export function AiBar() {
  const pathname = usePathname();
  const { selectedDay } = useSelectedDay();
  const { open, setOpen, messages, sending, error, send } = useChat(selectedDay);
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-wysokość: pole rośnie z treścią do MAX_ROWS, potem włącza się scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = MAX_ROWS * LINE_HEIGHT;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  function submit() {
    const text = value.trim();
    if (!text || sending) return;
    send(text);
    setValue("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter wysyła, Shift+Enter dodaje nowy wiersz.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const canSend = value.trim().length > 0 && !sending;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:left-[22rem]">
      <div className="bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-8">
        {open && (
          <ChatPanel
            day={selectedDay}
            messages={messages}
            sending={sending}
            error={error}
            onClose={() => setOpen(false)}
          />
        )}

        <div className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center gap-2 rounded-3xl border border-border bg-foreground/90 px-2 py-2 text-background shadow-lg backdrop-blur">
          <button
            type="button"
            disabled
            aria-label="Załącznik (wkrótce)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-background/60"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
            placeholder="Porozmawiaj o swoim dniu…"
            className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-5 text-background placeholder:text-background/50 focus:outline-none"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Wyślij"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-foreground transition-opacity",
              canSend ? "opacity-100" : "opacity-40",
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
