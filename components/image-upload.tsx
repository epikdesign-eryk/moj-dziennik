"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  getSignedUrls,
  removeEntryImages,
  uploadEntryImage,
} from "@/lib/entry-images";

interface ImageUploadProps {
  /** Ścieżki obiektów w buckecie (kontrolowane przez rodzica). */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Dodawanie wielu zdjęć do wpisu. Pliki trafiają od razu do prywatnego bucketa
 * (`uploadEntryImage`), a w stanie formularza trzymamy ich ścieżki. Podgląd:
 * świeżo wybrane pliki pokazujemy z lokalnego `objectURL` (natychmiast), a
 * ścieżki przekazane w trybie edycji — z podpisanego URL-a.
 */
export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lokalne objectURL-e do posprzątania przy odmontowaniu.
  const objectUrls = useRef<string[]>([]);

  // Dla ścieżek bez podglądu (np. wejście w edycję) pobierz podpisane URL-e.
  useEffect(() => {
    const missing = value.filter((p) => !previews[p]);
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
  }, [value, previews]);

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        const objectUrl = URL.createObjectURL(file);
        objectUrls.current.push(objectUrl);
        const path = await uploadEntryImage(file);
        added.push(path);
        setPreviews((prev) => ({ ...prev, [path]: objectUrl }));
      }
      onChange([...value, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wysłać zdjęcia.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(path: string) {
    onChange(value.filter((p) => p !== path));
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    // Best-effort kasowanie pliku z bucketa.
    removeEntryImages([path]).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((path) => (
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
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {uploading ? "Wysyłanie…" : "Dodaj zdjęcie"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
