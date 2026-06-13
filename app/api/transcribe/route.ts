// Route handler transkrypcji nagrań głosowych przez xAI STT (Grok).
//  POST /api/transcribe  (multipart: pole `file` = nagranie audio)
//    → { text }  rozpoznana treść
//
// Sesja z ciasteczek (musisz być zalogowany). Limit zapytań AI wspólny z czatem
// agenta — STT to płatne wywołanie modelu, więc liczymy je tak samo.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { grokTranscribe } from "@/lib/grok";
import { enforceAiRateLimit } from "@/lib/therapist-run";
import { ApiError } from "@/lib/journal-actions";

export const dynamic = "force-dynamic";

// Limit po stronie serwera niezależny od limitu przeglądarki (500 MB w xAI to
// dużo; nagranie z notatki jest krótkie). Odrzucamy oczywiste nadużycia.
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Zły format żądania." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Brak nagrania." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Nagranie jest za duże." }, { status: 413 });
  }

  try {
    await enforceAiRateLimit(user.id);
    const filename = file instanceof File ? file.name : "audio.webm";
    const text = await grokTranscribe({ file, filename, language: "pl" });
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("xAI STT error:", err);
    return NextResponse.json(
      { error: "Transkrypcja chwilowo niedostępna. Spróbuj ponownie." },
      { status: 502 },
    );
  }
}
