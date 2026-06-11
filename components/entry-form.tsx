"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoodPicker } from "@/components/mood-picker";
import { EntryEditor } from "@/components/entry-editor";
import { ImageUpload } from "@/components/image-upload";
import { formatDate } from "@/lib/journal-utils";
import type { JournalEntryDraft, Mood } from "@/types/journal";

interface EntryFormProps {
  /** Data wyświetlana w nagłówku (ISO). Domyślnie dziś. */
  date?: string;
  /** Wartości początkowe (tryb edycji). */
  initial?: Partial<JournalEntryDraft>;
  submitLabel?: string;
  /** Tekst przycisku anulowania (np. „Wróć do listy"). */
  cancelLabel?: string;
  onSubmit: (draft: JournalEntryDraft) => void;
  onCancel?: () => void;
}

export function EntryForm({
  date,
  initial,
  submitLabel = "Zapisz",
  cancelLabel = "Anuluj",
  onSubmit,
  onCancel,
}: EntryFormProps) {
  const [content, setContent] = useState(initial?.content ?? "");
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [error, setError] = useState<string | null>(null);

  const displayDate = formatDate(date ?? new Date().toISOString());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasContent = content.replace(/<[^>]*>/g, "").trim().length > 0;
    if (!hasContent) {
      setError("Napisz treść wpisu.");
      return;
    }
    if (!mood) {
      setError("Wybierz swój nastrój.");
      return;
    }
    onSubmit({ content, mood, images });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-24">
      {/* Pasek górny: tylko data — akcje są w stałym pasku u dołu ekranu. */}
      <p className="text-xs font-light uppercase tracking-wide text-muted-foreground">
        {displayDate}
      </p>

      <div className="flex flex-col gap-2">
        <Label>Treść</Label>
        <EntryEditor
          value={content}
          onChange={setContent}
          placeholder="Co dziś czujesz, co się wydarzyło?"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Nastrój</Label>
        <MoodPicker value={mood} onChange={setMood} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Zdjęcia</Label>
        <ImageUpload value={images} onChange={setImages} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stały pasek akcji u dołu ekranu (mobile i desktop). Na desktopie
          odsunięty o szerokość panelu bocznego, a przyciski wyśrodkowane do
          szerokości kolumny treści (max-w-2xl). */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:left-[22rem]">
        <div className="mx-auto flex w-full max-w-2xl gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onCancel}
              className="flex-1"
            >
              {cancelLabel}
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1">
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
