"use client";

// Rozwijany panel rozmowy z agentem AI, wysuwany NAD dolnym paskiem (AiBar).
// Pokazuje wątek bieżącego dnia, disclaimer i stan „pisze…".

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ChatMsg } from "@/lib/use-chat";
import { cn } from "@/lib/utils";
import { getTherapist, DEFAULT_THERAPIST_ID } from "@/lib/therapists";
import { TherapistAvatar } from "@/components/therapist-avatar";

function prettyDay(day: string): string {
  if (!day) return "";
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ChatPanel({
  therapistId = DEFAULT_THERAPIST_ID,
  day,
  messages,
  sending,
  error,
  onClose,
}: {
  therapistId?: string;
  day: string;
  messages: ChatMsg[];
  sending: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const therapist = getTherapist(therapistId) ?? getTherapist(DEFAULT_THERAPIST_ID)!;

  // Auto-scroll na dół przy nowych wiadomościach / stanie pisania.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  return (
    <div className="pointer-events-auto mx-auto mb-2 flex max-h-[60vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-xl">
      {/* Nagłówek */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TherapistAvatar therapistId={therapist.id} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{therapist.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {therapist.tagline} · {prettyDay(day)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zwiń rozmowę"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Wiadomości */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            Zadaj pytanie o swój dzień albo o to, jak zmienia się Twój nastrój.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground",
              )}
            >
              {m.pending ? (
                <span className="inline-flex gap-1" aria-label="Pisze…">
                  <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                </span>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* Disclaimer */}
      <p className="border-t border-border px-4 py-2 text-center text-[11px] leading-tight text-muted-foreground">
        To wsparcie AI — nie zastępuje kontaktu z psychoterapeutą ani pomocy
        medycznej. W kryzysie zadzwoń pod 112 lub 116 123.
      </p>
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
      style={{ animationDelay: delay }}
    />
  );
}
