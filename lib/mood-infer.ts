// Wnioskowanie nastroju (1–5) z treści wpisu, gdy API nie poda `mood` jawnie.
// Używa Grok (lib/grok.ts). Przy jakimkolwiek problemie zwraca neutralne 3,
// żeby dodanie wpisu nigdy nie padło tylko przez brak oceny nastroju.

import { grokChat } from "@/lib/grok";
import type { Mood } from "@/types/journal";

const INFER_PROMPT = `Oceń ogólny nastrój autora poniższego wpisu dziennika w skali 1–5:
1 = źle, 2 = słabo, 3 = tak sobie, 4 = dobrze, 5 = świetnie.
Kieruj się emocjami i wydźwiękiem słów, nie liczbą wydarzeń.
Odpowiedz WYŁĄCZNIE jedną cyfrą od 1 do 5, bez żadnego dodatkowego tekstu.`;

function clampMood(n: number): Mood {
  const i = Math.round(n);
  if (i <= 1) return 1;
  if (i >= 5) return 5;
  return i as Mood;
}

/** Zwraca nastrój 1–5 wywnioskowany z tekstu; fallback 3 przy błędzie. */
export async function inferMood(text: string): Promise<Mood> {
  try {
    const reply = await grokChat({
      messages: [
        { role: "system", content: INFER_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0,
    });
    const digit = (reply.content ?? "").match(/[1-5]/);
    return digit ? clampMood(Number(digit[0])) : 3;
  } catch {
    return 3;
  }
}
