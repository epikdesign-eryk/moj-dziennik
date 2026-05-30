"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoodPicker } from "@/components/mood-picker";
import { EntryEditor } from "@/components/entry-editor";
import { ImagePlaceholderButton } from "@/components/image-placeholder-button";
import { formatDate } from "@/lib/journal-utils";
import type { JournalEntryDraft, Mood } from "@/types/journal";

interface EntryFormProps {
  /** Data wyświetlana w nagłówku (ISO). Domyślnie dziś. */
  date?: string;
  /** Wartości początkowe (tryb edycji). */
  initial?: Partial<JournalEntryDraft>;
  submitLabel?: string;
  onSubmit: (draft: JournalEntryDraft) => void;
  onCancel?: () => void;
}

export function EntryForm({
  date,
  initial,
  submitLabel = "Zapisz",
  onSubmit,
  onCancel,
}: EntryFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [error, setError] = useState<string | null>(null);

  const displayDate = formatDate(date ?? new Date().toISOString());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasContent = content.replace(/<[^>]*>/g, "").trim().length > 0;
    if (!title.trim() && !hasContent) {
      setError("Dodaj tytuł lub treść wpisu.");
      return;
    }
    if (!mood) {
      setError("Wybierz swój nastrój.");
      return;
    }
    onSubmit({ title: title.trim(), content, mood, image: initial?.image ?? null });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <p className="text-xs font-light uppercase tracking-wide text-muted-foreground">
        {displayDate}
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Tytuł</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Jak nazwać dzisiejszy dzień?"
          className="h-auto px-4 py-2 text-lg"
        />
      </div>

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
        <Label>Zdjęcie</Label>
        <ImagePlaceholderButton />
      </div>

      {/* Odstęp, by ostatnie pole nie chowało się pod przyklejonym paskiem akcji. */}
      <div className="h-24" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={onCancel}
              >
                Anuluj
              </Button>
            )}
            <Button type="submit" size="lg" className="flex-1">
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
