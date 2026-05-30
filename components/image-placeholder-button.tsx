"use client";

import { ImagePlus } from "lucide-react";

/**
 * Nieaktywny przycisk dodawania zdjęcia — funkcja zaplanowana na kolejny etap.
 * Świadomie wyłączony, z czytelną informacją „wkrótce".
 */
export function ImagePlaceholderButton() {
  return (
    <button
      type="button"
      disabled
      title="Dodawanie zdjęć pojawi się w kolejnym etapie"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-4 text-sm text-muted-foreground cursor-not-allowed"
    >
      <ImagePlus className="h-4 w-4" />
      Dodaj zdjęcie · wkrótce
    </button>
  );
}
