"use client";

import { cn } from "@/lib/utils";
import { MOODS, moodLabel } from "@/lib/journal-utils";
import type { Mood } from "@/types/journal";

interface MoodPickerProps {
  value: Mood | null;
  onChange: (mood: Mood) => void;
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {MOODS.map((m) => {
          const active = value === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              aria-label={m.label}
              aria-pressed={active}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-all",
                "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary scale-110 shadow-sm"
                  : "bg-secondary opacity-70 hover:opacity-100",
              )}
            >
              {m.emoji}
            </button>
          );
        })}
      </div>
      {value && (
        <span className="text-sm text-muted-foreground">{moodLabel(value)}</span>
      )}
    </div>
  );
}
