"use client";

import { useEffect, useState } from "react";
import { ImageLightbox } from "@/components/image-lightbox";
import { getSignedUrls } from "@/lib/entry-images";
import { cn } from "@/lib/utils";

interface ImageGridProps {
  /** Ścieżki obiektów w buckecie (z `entry.images`). */
  paths: string[];
}

/**
 * Miniatury zdjęć wpisu. Pokazujemy maksymalnie dwa pierwsze; gdy jest ich
 * więcej — drugi kafelek dostaje nakładkę „+N". Kliknięcie otwiera galerię
 * (lightbox) ze wszystkimi zdjęciami.
 */
export function ImageGrid({ paths }: ImageGridProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    let active = true;
    getSignedUrls(paths).then((signed) => {
      if (active) setUrls(signed);
    });
    return () => {
      active = false;
    };
  }, [paths]);

  if (paths.length === 0 || urls.length === 0) return null;

  // Pokazujemy maks. 2 miniatury; przy >2 drugi kafelek dostaje licznik „+N".
  const visible = urls.slice(0, 2);
  const extra = urls.length - 2;

  function openAt(i: number) {
    setStartIndex(i);
    setOpen(true);
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          visible.length === 1 ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {visible.map((url, i) => {
          const isLastWithExtra = i === 1 && extra > 0;
          return (
            <button
              key={url}
              type="button"
              onClick={() => openAt(i)}
              className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-secondary/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Zdjęcie ${i + 1}`}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
              {isLastWithExtra && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
                  +{extra}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <ImageLightbox
          urls={urls}
          startIndex={startIndex}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
