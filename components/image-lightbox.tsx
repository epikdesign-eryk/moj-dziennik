"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  /** Podpisane URL-e zdjęć do przeglądania. */
  urls: string[];
  /** Indeks początkowo otwartego zdjęcia. */
  startIndex: number;
  onClose: () => void;
}

/** Pełnoekranowa galeria: strzałki ‹ ›, licznik k/N, zamknięcie Esc / klik tła. */
export function ImageLightbox({ urls, startIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + urls.length) % urls.length),
    [urls.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % urls.length),
    [urls.length],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Zamknij"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Poprzednie"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Następne"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-16"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[index]}
        alt={`Zdjęcie ${index + 1} z ${urls.length}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-lg object-contain"
      />

      {urls.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {index + 1} / {urls.length}
        </p>
      )}
    </div>,
    document.body,
  );
}
