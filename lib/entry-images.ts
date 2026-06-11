// Obsługa zdjęć wpisów w prywatnym buckecie Storage `entry-images`.
// Pliki leżą pod folderem użytkownika: `{userId}/{uuid}.{ext}` — pierwszy segment
// ścieżki jest wymagany przez polityki RLS (dostęp tylko do własnego folderu).
// W bazie (`entries.images`) trzymamy te ścieżki; do wyświetlenia generujemy
// podpisane URL-e o ograniczonym czasie ważności.

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
export const BUCKET = "entry-images";

/** Ważność podpisanego URL-a (1 h) — wystarcza na obejrzenie wpisu. */
const SIGNED_TTL = 60 * 60;

/** Maksymalny rozmiar pliku (10 MB) — spójny z limitem bucketa. */
const MAX_BYTES = 10 * 1024 * 1024;

function extFromFile(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  if (fromName) return fromName;
  // Fallback z typu MIME, np. "image/png" → "png".
  const fromType = file.type.split("/")[1];
  return fromType || "bin";
}

/**
 * Wysyła jeden plik do bucketa i zwraca jego ścieżkę (do zapisania w `images`).
 * Rzuca błędem przy złym typie/rozmiarze albo braku sesji.
 */
export async function uploadEntryImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Można dodać tylko pliki graficzne.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Zdjęcie jest za duże (maks. 10 MB).");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się ponownie.");

  const path = `${user.id}/${crypto.randomUUID()}.${extFromFile(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  return path;
}

/** Kasuje pliki z bucketa (best-effort — błąd nie jest krytyczny). */
export async function removeEntryImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

/**
 * Zamienia ścieżki obiektów na podpisane URL-e (w tej samej kolejności).
 * Ścieżki, których nie udało się podpisać, są pomijane.
 */
export async function getSignedUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_TTL);
  if (error || !data) return [];
  return data
    .map((item) => item.signedUrl)
    .filter((url): url is string => Boolean(url));
}
