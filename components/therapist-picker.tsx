"use client";

// Picker psychoterapeutów: wyróżniona ikona „mózgu" (akcent primary) obok kalendarza.
// Otwiera popup z listą person — aktywną można wybrać, płatne kupić przez Stripe.

import { useState } from "react";
import { Brain, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveTherapist } from "@/lib/active-therapist";
import { TherapistAvatar } from "@/components/therapist-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function TherapistPicker() {
  const { catalog, active, unlocked, setActive } = useActiveTherapist();
  const [open, setOpen] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(therapistId: string) {
    setError(null);
    setBuying(therapistId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapistId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (res.ok && data.url) {
        window.location.assign(data.url); // → Stripe Checkout
        return;
      }
      setError(data.error ?? "Nie udało się rozpocząć płatności.");
    } catch {
      setError("Nie udało się rozpocząć płatności.");
    } finally {
      setBuying(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Wybierz psychoterapeutę"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/25 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        }
      >
        <Brain className="h-5 w-5" />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-2">
        <p className="px-2 py-1 text-sm font-semibold">Psychoterapeuci</p>
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          Wybierz, z kim chcesz rozmawiać. Nowych możesz dokupić.
        </p>

        <div className="flex flex-col gap-1">
          {catalog.map((t) => {
            const isUnlocked = t.free || unlocked.has(t.id);
            const isActive = t.id === active.id;
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-2",
                  isActive && "bg-accent",
                )}
              >
                <TherapistAvatar therapistId={t.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {t.name}
                    {!isUnlocked && (
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.blurb}
                  </p>
                </div>

                {isActive ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    <Check className="h-4 w-4" /> Aktywny
                  </span>
                ) : isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActive(t.id);
                      setOpen(false);
                    }}
                    className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    Wybierz
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={buying != null}
                    onClick={() => buy(t.id)}
                    className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {buying === t.id ? "Łączę…" : `Kup za ${t.priceLabel}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-2 rounded-lg bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {error}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
