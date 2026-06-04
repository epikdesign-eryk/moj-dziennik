"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { moodEmoji, moodLabel, excerpt } from "@/lib/journal-utils";
import { cn } from "@/lib/utils";
import type { JournalEntry } from "@/types/journal";

/** Czas przytrzymania (ms) aktywujący tryb przeciągania. */
const LONG_PRESS_MS = 250;
/** Ruch (px) przed aktywacją, który traktujemy jako przewijanie i anulujemy long-press. */
const MOVE_CANCEL_THRESHOLD = 10;

interface EntryListItemProps {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  /** Informuje rodzica o wejściu/wyjściu z trybu przeciągania (np. by ukryć FAB). */
  onDragChange?: (dragging: boolean) => void;
  /** Wyróżnia kartę jako aktualnie wybraną (panel boczny na desktopie). */
  active?: boolean;
}

export function EntryListItem({ entry, onDelete, onDragChange, active }: EntryListItemProps) {
  const preview = excerpt(entry.content);
  const dateObj = new Date(entry.date);
  const dayNum = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString("pl-PL", { month: "long" });

  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [overZone, setOverZone] = useState(false);
  // Pozycja/szerokość karty zapamiętana w chwili startu przeciągania — pływająca
  // kopia renderowana jest przez portal (fixed), by nie była przycinana przez
  // kontener z overflow (np. przewijany panel boczny na desktopie).
  const [dragRect, setDragRect] = useState<{ left: number; top: number; width: number } | null>(null);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const didDragRef = useRef(false);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  function clearTimer() {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function isInZone(x: number, y: number) {
    const el = zoneRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return; // tylko lewy przycisk myszy
    startRef.current = { x: e.clientX, y: e.clientY };
    pointerIdRef.current = e.pointerId;
    didDragRef.current = false;
    clearTimer();
    pressTimer.current = window.setTimeout(() => {
      // Aktywacja przeciągania po przytrzymaniu.
      draggingRef.current = true;
      didDragRef.current = true;
      const r = cardRef.current?.getBoundingClientRect();
      if (r) setDragRect({ left: r.left, top: r.top, width: r.width });
      setDragging(true);
      onDragChange?.(true);
      try {
        cardRef.current?.setPointerCapture(pointerIdRef.current!);
      } catch {
        /* ignore */
      }
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    if (!draggingRef.current) {
      // Ruch przed aktywacją = użytkownik przewija listę → anuluj long-press.
      if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD) {
        clearTimer();
        startRef.current = null;
      }
      return;
    }

    e.preventDefault();
    setOffset({ x: dx, y: dy });
    setOverZone(isInZone(e.clientX, e.clientY));
  }

  function endDrag(e: React.PointerEvent) {
    clearTimer();
    if (draggingRef.current) {
      const inZone = isInZone(e.clientX, e.clientY);
      draggingRef.current = false;
      setDragging(false);
      setOverZone(false);
      setOffset({ x: 0, y: 0 });
      setDragRect(null);
      onDragChange?.(false);
      try {
        cardRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (inZone) onDelete(entry.id);
    }
    startRef.current = null;
  }

  // Treść karty — renderowana w miejscu (w liście) oraz, podczas przeciągania,
  // jako pływająca kopia w portalu. `floating` przełącza styl chwytania/cienia
  // i czerwoną nakładkę nad strefą usuwania.
  const renderCard = (floating: boolean) => (
    <Card
      className={cn(
        "relative flex-row items-center gap-4 p-5 transition-all duration-150 ease-out will-change-transform",
        floating
          ? "cursor-grabbing select-none shadow-xl ring-2 ring-primary"
          : "hover:-translate-y-1 hover:bg-accent/40 hover:shadow-lg",
        active && !floating && "bg-accent/50 ring-2 ring-primary",
      )}
    >
      {/* Lewa kolumna: duża data (numer dnia + miesiąc pod spodem). */}
      <div className="flex w-14 shrink-0 flex-col items-center text-center leading-none">
        <span className="text-lg font-semibold">{dayNum}</span>
        <span className="mt-1 text-xs capitalize text-muted-foreground">
          {monthName}
        </span>
      </div>

      {/* Pionowy dzielnik między datą a treścią. */}
      <span className="w-px self-stretch bg-border" aria-hidden />

      {/* Prawa kolumna: u góry mały mood, pod nim wycinek notatki. */}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-base" aria-hidden>
            {moodEmoji(entry.mood)}
          </span>
          {moodLabel(entry.mood)}
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm text-foreground">
          {preview || "(pusty wpis)"}
        </p>
      </div>

      {/* Czerwony overlay na całą kartę, gdy jest nad strefą usuwania. */}
      {floating && overZone && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-destructive/60" />
      )}
    </Card>
  );

  return (
    <>
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={dragging ? { touchAction: "none" } : undefined}
        className="relative"
      >
        {/* Karta w miejscu trzyma layout listy; podczas przeciągania jest ukryta,
            a widoczna jest pływająca kopia z portalu. */}
        <Link
          href={`/entry/${entry.id}`}
          className={cn("block", dragging && "opacity-0")}
          draggable={false}
          onClick={(e) => {
            // Po przeciąganiu nie otwieramy wpisu.
            if (didDragRef.current) {
              e.preventDefault();
              didDragRef.current = false;
            }
          }}
        >
          {renderCard(false)}
        </Link>
      </div>

      {/* Pływająca kopia karty — fixed w portalu, nie przycinana przez overflow. */}
      {dragging &&
        dragRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60]"
            style={{
              left: dragRect.left,
              top: dragRect.top,
              width: dragRect.width,
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(-1.5deg)`,
            }}
          >
            {renderCard(true)}
          </div>,
          document.body,
        )}

      {dragging &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={zoneRef}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-center gap-1.5 py-8 transition-colors",
              "animate-in slide-in-from-bottom fade-in duration-200 ease-out",
              overZone
                ? "bg-destructive/25"
                : "bg-gradient-to-t from-destructive/15 to-transparent",
            )}
          >
            <Trash2
              className={cn(
                "h-7 w-7 text-destructive transition-transform",
                overZone && "scale-125",
              )}
            />
            <span className="text-sm font-medium text-destructive">
              Przesuń i usuń
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
