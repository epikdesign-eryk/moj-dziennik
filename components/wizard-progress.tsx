"use client";

import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  /** Postęp 0–100. Pasek animuje zmianę szerokości. */
  progress: number;
  /** Gdy podane — pokazuje strzałkę wstecz po lewej (krok 2 → krok 1). */
  onBack?: () => void;
  /** Zamknięcie kreatora (X) — zwykle powrót na „/". */
  onClose: () => void;
}

/**
 * Górny pasek kreatora wpisu: opcjonalna strzałka wstecz, cienki pasek postępu
 * i „X" do wyjścia. Postęp rośnie wraz z kolejnymi krokami i uzupełnianiem
 * treści (animowana szerokość).
 */
export function WizardProgress({ progress, onBack, onClose }: WizardProgressProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="flex items-center gap-3 py-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Wróć"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <span className="h-8 w-8 shrink-0" aria-hidden />
      )}

      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-500 ease-out",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Zamknij"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
