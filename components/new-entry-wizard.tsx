"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type Editor } from "@tiptap/react";
import { ArrowRight, ImagePlus, Loader2, Mic, Square, X } from "lucide-react";
import { WizardProgress } from "@/components/wizard-progress";
import { MoodSlider } from "@/components/mood-slider";
import { EntryEditor, Toolbar, insertTextAtCursor } from "@/components/entry-editor";
import { useEntries } from "@/lib/use-entries";
import {
  getSignedUrls,
  removeEntryImages,
  uploadEntryImage,
} from "@/lib/entry-images";
import {
  useVoiceTranscription,
  formatElapsed,
} from "@/lib/use-voice-transcription";
import { formatDateOnly } from "@/lib/journal-utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Mood } from "@/types/journal";

// Postęp w pasku górnym (procenty). Krok 1 stały; krok 2 rośnie z treścią.
const PROGRESS_STEP1 = 33;
const PROGRESS_STEP2_BASE = 60;
const PROGRESS_TEXT_BONUS = 20;
const PROGRESS_IMAGE_BONUS = 20;

const DEFAULT_MOOD: Mood = 3;

/**
 * Kreator dodawania wpisu — dwa kroki:
 *  1) wybór nastroju animowanym sliderem,
 *  2) treść notatki (TipTap), zdjęcia i dyktowanie głosowe w dolnym pasku.
 * Zapis (createEntry) i przekierowanie do podglądu dzieje się po kliknięciu „→"
 * w kroku 2.
 */
export function NewEntryWizard() {
  const router = useRouter();
  const { createEntry } = useEntries();

  const [step, setStep] = useState<1 | 2>(1);
  const [mood, setMood] = useState<Mood>(DEFAULT_MOOD);
  const [moodTouched, setMoodTouched] = useState(false);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const editorRef = useRef<Editor | null>(null);

  // Imię właściciela konta do nagłówka kroku 1 (jak na liście wpisów).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const n = (data.user?.user_metadata?.name as string) ?? "";
      setName(n.trim());
    });
  }, []);

  const hasText = content.replace(/<[^>]*>/g, "").trim().length > 0;

  const progress =
    step === 1
      ? PROGRESS_STEP1
      : Math.min(
          100,
          PROGRESS_STEP2_BASE +
            (hasText ? PROGRESS_TEXT_BONUS : 0) +
            (images.length > 0 ? PROGRESS_IMAGE_BONUS : 0),
        );

  function close() {
    router.push("/");
  }

  function handleMoodChange(next: Mood) {
    setMood(next);
    setMoodTouched(true);
  }

  async function handleSave() {
    if (saving) return;
    if (!hasText) {
      setError("Napisz albo podyktuj kilka słów, zanim zapiszesz.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const entry = await createEntry({ content, mood, images });
      router.push(`/entry/${entry.id}`);
    } catch {
      setError("Nie udało się zapisać wpisu. Spróbuj ponownie.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-28 pt-2">
      <WizardProgress
        progress={progress}
        onClose={close}
        onBack={step === 2 ? () => setStep(1) : undefined}
      />

      {step === 1 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <MoodSlider value={mood} name={name} onChange={handleMoodChange} />
        </div>
      ) : (
        <NoteStep
          content={content}
          onContentChange={setContent}
          images={images}
          onImagesChange={setImages}
          onEditorReady={(e) => (editorRef.current = e)}
        />
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Krok 1: floating „→" wyrównane do tej samej pozycji co w kroku 2
          (prawa krawędź wyśrodkowanej kolumny, z offsetem panelu bocznego). */}
      {step === 1 && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-5 pt-4 lg:left-[22rem]">
          <div className="mx-auto flex w-full max-w-2xl justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!moodTouched}
              aria-label="Dalej"
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all",
                moodTouched
                  ? "opacity-100 hover:scale-105"
                  : "cursor-not-allowed opacity-40",
              )}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Krok 2: dolny pasek z trzema przyciskami (zdjęcie / mikrofon / dalej). */}
      {step === 2 && (
        <BottomBar
          editor={editorRef.current}
          images={images}
          onImagesChange={setImages}
          onError={setError}
          saving={saving}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* --- Krok 2: notatka --------------------------------------------------- */

function NoteStep({
  content,
  onContentChange,
  images,
  onImagesChange,
  onEditorReady,
}: {
  content: string;
  onContentChange: (html: string) => void;
  images: string[];
  onImagesChange: (next: string[]) => void;
  onEditorReady: (editor: Editor) => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const today = new Date().toISOString();
  const isEmpty = content.replace(/<[^>]*>/g, "").trim().length === 0;

  return (
    <div className="flex flex-1 flex-col gap-4 pt-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Note
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {formatDateOnly(today)}
        </span>
      </div>

      {editor && <Toolbar editor={editor} showVoice={false} className="-mx-1" />}

      {/* Edytor TipTap nie ma rozszerzenia Placeholder, więc empty-state
          renderujemy jako własną nakładkę widoczną, gdy treść jest pusta. */}
      <div className="relative">
        {isEmpty && (
          <p className="pointer-events-none absolute left-3 top-2 text-muted-foreground">
            Napisz albo powiedz, jak się dzisiaj czujesz?
          </p>
        )}
        <EntryEditor
          value={content}
          onChange={onContentChange}
          bare
          onReady={(e) => {
            setEditor(e);
            onEditorReady(e);
          }}
        />
      </div>

      <ImageThumbs images={images} onChange={onImagesChange} />
    </div>
  );
}

/** Miniatury dodanych zdjęć z możliwością usunięcia (wzorzec z image-upload). */
function ImageThumbs({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const missing = images.filter((p) => !previews[p]);
    if (missing.length === 0) return;
    let active = true;
    getSignedUrls(missing).then((urls) => {
      if (!active) return;
      setPreviews((prev) => {
        const next = { ...prev };
        missing.forEach((path, i) => {
          if (urls[i]) next[path] = urls[i];
        });
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [images, previews]);

  if (images.length === 0) return null;

  function handleRemove(path: string) {
    onChange(images.filter((p) => p !== path));
    removeEntryImages([path]).catch(() => {});
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {images.map((path) => (
        <div
          key={path}
          className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary/40"
        >
          {previews[path] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previews[path]}
              alt="Załączone zdjęcie"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={() => handleRemove(path)}
            aria-label="Usuń zdjęcie"
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow transition-opacity hover:bg-background group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* --- Krok 2: dolny pasek ----------------------------------------------- */

function BottomBar({
  editor,
  images,
  onImagesChange,
  onError,
  saving,
  onSave,
}: {
  editor: Editor | null;
  images: string[];
  onImagesChange: (next: string[]) => void;
  onError: (msg: string | null) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const voice = useVoiceTranscription({
    onText: (text) => {
      if (editor) insertTextAtCursor(editor, text);
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onError(null);
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        const path = await uploadEntryImage(file);
        added.push(path);
      }
      onImagesChange([...images, ...added]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Nie udało się wysłać zdjęcia.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const recording = voice.state === "recording";
  const processing = voice.state === "processing";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-5 pt-4 lg:left-[22rem]">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
        {/* Lewo — dodawanie zdjęcia. */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Dodaj zdjęcie"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-transform hover:scale-105 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Środek — dyktowanie głosowe (animacja przy nagrywaniu). */}
        <button
          type="button"
          onClick={recording ? voice.stop : voice.start}
          disabled={processing}
          aria-label={recording ? "Zatrzymaj nagrywanie" : "Dyktuj głosowo"}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full shadow-md transition-colors",
            recording
              ? "bg-destructive text-white"
              : "bg-card text-foreground hover:bg-secondary",
          )}
        >
          {recording && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
          )}
          {processing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : recording ? (
            <span className="relative flex items-center gap-1.5">
              <Square className="h-4 w-4 fill-current" />
              <span className="text-xs tabular-nums">
                {formatElapsed(voice.elapsed)}
              </span>
            </span>
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </button>

        {/* Prawo — zapis i przejście do podglądu wpisu. */}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-label="Zapisz wpis"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </button>
      </div>

      {voice.error && (
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-destructive">
          {voice.error}
        </p>
      )}
    </div>
  );
}
