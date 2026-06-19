"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelectedDay } from "@/lib/selected-day";
import { useChat } from "@/lib/use-chat";
import { useActiveTherapist } from "@/lib/active-therapist";
import { ChatPanel } from "@/components/chat-panel";
import { TherapistAvatar } from "@/components/therapist-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const { active, catalog, unlocked, setActive } = useActiveTherapist();
  const [value, setValue] = useState("");
  const [switcherOpen, setSwitcherOpen] = useState(false);
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
    send(text, active.id);
    setValue("");
  }

  // Persony dostępne do szybkiej zmiany (odblokowane).
  const switchable = catalog.filter((t) => unlocked.has(t.id));

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
            therapistId={active.id}
            day={selectedDay}
            messages={messages}
            sending={sending}
            error={error}
            onClose={() => setOpen(false)}
          />
        )}

        <div className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center gap-2 rounded-3xl border border-border bg-card/95 px-2 py-2 text-foreground shadow-md backdrop-blur">
          <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label={`Rozmawiasz z: ${active.name}. Zmień psychoterapeutę`}
                  className="shrink-0 rounded-xl ring-offset-2 ring-offset-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              <TherapistAvatar therapistId={active.id} size="md" />
            </PopoverTrigger>

            <PopoverContent align="start" side="top" className="w-60 p-1.5">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Rozmawiasz z
              </p>
              {switchable.map((t) => {
                const isActive = t.id === active.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActive(t.id);
                      setSwitcherOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                      isActive && "bg-accent",
                    )}
                  >
                    <TherapistAvatar therapistId={t.id} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    {isActive && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
              <p className="px-2 pt-1.5 text-[11px] leading-tight text-muted-foreground">
                Więcej psychoterapeutów odblokujesz ikoną mózgu obok kalendarza.
              </p>
            </PopoverContent>
          </Popover>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
            placeholder="Porozmawiaj o swoim dniu…"
            className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Wyślij"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity",
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
