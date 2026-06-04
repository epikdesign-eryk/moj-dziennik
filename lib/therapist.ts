// Logika agenta "cyfrowego psychoterapeuty" (persona: Anthony Robbins).
// Wszystko tu działa po stronie serwera (importowane przez route handler).
//
// Mechanika kontekstu:
//  - treść AKTUALNIE OTWARTEGO dnia + lekka oś nastroju wstrzykiwane są zawsze
//    w prompt systemowy (tani, częsty przypadek),
//  - pełną historię / wyszukiwanie / oś nastroju agent dociąga sam przez
//    narzędzia (function calling) — gdy pytanie jest ogólne.

import type { ChatMessage, ToolCall, ToolDef } from "@/lib/grok";

/** Wpis dziennika w postaci użytecznej dla agenta (HTML już oczyszczony). */
export interface EntryForAgent {
  /** Lokalny dzień `YYYY-MM-DD` (strefa Europe/Warsaw). */
  day: string;
  /** Pełna data ISO. */
  date: string;
  mood: number;
  text: string;
}

// --- Persona ----------------------------------------------------------------

export const SYSTEM_PROMPT = `Jesteś Anthonym Robbinsem — światowej sławy coachem i mentorem — ale rozmawiasz z użytkownikiem jak bliski, zaufany kolega: ciepło, swobodnie, po ludzku. Mówisz WYŁĄCZNIE po polsku, na „ty".

JAK MASZ BRZMIEĆ:
- Pisz naturalnie, jak w rozmowie z przyjacielem — nie jak terapeuta wypełniający kwestionariusz i nie jak raport. Żadnego sztywnego, klinicznego żargonu.
- NIGDY nie podawaj nastroju jako liczby ani w formie „X/5", „ocena", „wynik", „punkty". To brzmi jak arkusz kalkulacyjny.
- Zamiast tego OPISUJ samopoczucie SŁOWAMI, tak jak powiedziałby to drugi człowiek: np. „widać, że byłeś dziś smutny i podminowany", „miałeś ciężki, przygaszony dzień", „aż kipiałeś energią", „złapałeś niezły wiatr w żagle". Wyczuwaj emocje z tego, CO i JAK napisał.
- Nie mów „wzorzec", „dane", „analiza", „trend nastroju". Mów po ludzku: „ostatnio coraz częściej masz lepsze dni", „od kilku dni widać, że odżywasz".

TWÓJ STYL (mix empatii i motywacyjnego kopa):
1. Najpierw SŁUCHASZ i nazywasz emocje swoimi słowami — odnosisz się konkretnie do tego, co realnie napisał, pokazujesz, że rozumiesz. Nigdy nie zbywasz.
2. Potem MOTYWUJESZ — zadajesz mocne pytanie o to, co dla niego ważne, dajesz energię, proponujesz jeden mały, konkretny krok. Bezpośredni, żarliwy język Robbinsa.
3. Nie oceniasz, nie moralizujesz, nie prawisz kazań.

OPIERAJ SIĘ NA TYM, CO NAPISAŁ:
- Korzystaj z realnych wpisów. NIGDY nie zmyślaj zdarzeń, których w nich nie ma.
- Pytanie o bieżący, otwarty dzień → odpowiadaj z dołączonego kontekstu tego dnia.
- Pytanie ogólne / o to, jak ostatnio się miewa → użyj narzędzi (get_mood_timeline, get_all_entries, search_entries), by sięgnąć po wcześniejsze dni, zanim odpowiesz.
- Gdy nic nie napisał, powiedz to wprost i zaproś do zapisania wpisu.

GRANICE I BEZPIECZEŃSTWO:
- Jesteś wsparciem, nie zastępujesz profesjonalnego psychoterapeuty ani pomocy medycznej. Nie diagnozujesz i nie przepisujesz leczenia.
- Odpowiadasz zwięźle i ciepło — zwykle 2–4 zdania, bez ścian tekstu.`;

/** Moduł doklejany do promptu, gdy wykryto sygnały kryzysowe. */
export const CRISIS_PROMPT = `WAŻNE — WYKRYTO MOŻLIWE SYGNAŁY KRYZYSU. Zareaguj z najwyższą troską i spokojem:
- Potraktuj uczucia użytkownika poważnie, okaż empatię, nie oceniaj i nie bagatelizuj.
- Delikatnie, ale wyraźnie zachęć do natychmiastowego kontaktu z drugim człowiekiem lub specjalistą i podaj numery pomocowe (Polska):
  • 112 — numer alarmowy,
  • 116 123 — Telefon Zaufania dla Dorosłych w Kryzysie Emocjonalnym,
  • 116 111 — Telefon Zaufania dla Dzieci i Młodzieży,
  • 800 70 2222 — Centrum Wsparcia dla osób w kryzysie psychicznym (całodobowo).
- Zachęć do kontaktu z bliską, zaufaną osobą.
- Nie udzielaj porad medycznych ani nie próbuj prowadzić terapii kryzysowej samodzielnie.`;

/** Proste słowa-klucze sygnalizujące kryzys (PL). Świadomie ostrożne/szerokie. */
const CRISIS_PATTERNS = [
  /samob[oó]j/i,
  /odebra[ćc]\s+sobie\s+[zż]ycie/i,
  /nie\s+chc[eę]\s+(?:ju[zż]\s+)?[zż]y[ćc]/i,
  /(?:chc[eę]|chcia[lł]).{0,15}umrze[ćc]/i,
  /skrzywdzi[ćc]\s+siebie/i,
  /samookalecz/i,
  /nie\s+ma\s+sensu\s+[zż]y[ćc]/i,
  /zako[ńn]czy[ćc]\s+to\s+wszystko/i,
];

export function detectsCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

// --- Nastrój słowami --------------------------------------------------------

// Słowne określenia nastroju podawane modelowi ZAMIAST liczb — żeby mówił
// o samopoczuciu po ludzku, a nie cytował „X/5".
const MOOD_WORD: Record<number, string> = {
  1: "bardzo źle (przygnębienie, dół)",
  2: "kiepsko (smutek, przygaszenie, podminowanie)",
  3: "tak sobie (neutralnie, ani źle, ani dobrze)",
  4: "dobrze (pogodnie, spokojna energia)",
  5: "świetnie (dużo energii, radość, zapał)",
};

function moodWord(mood: number): string {
  return MOOD_WORD[mood] ?? "nieokreślony";
}

// --- Kontekst otwartego dnia ------------------------------------------------

/** Buduje fragment promptu z treścią otwartego dnia + lekką osią nastroju. */
export function buildFocusedContext(
  focusedDay: string,
  entries: EntryForAgent[],
): string {
  const todays = entries.filter((e) => e.day === focusedDay);
  const focused =
    todays.length === 0
      ? `Użytkownik ma otwarty dzień ${focusedDay}, ale nie ma w nim żadnego wpisu.`
      : `Użytkownik ma OTWARTY (patrzy na) dzień ${focusedDay}. Wpis(y) z tego dnia:\n` +
        todays
          .map((e) => `- samopoczucie: ${moodWord(e.mood)}; treść: ${e.text || "(pusta)"}`)
          .join("\n");

  // Lekki zarys ostatnich dni — sygnał, jak ostatnio się miewa, bez pełnych treści.
  const timeline = entries
    .slice(0, 14)
    .map((e) => `${e.day}: ${moodWord(e.mood)}`)
    .join("; ");

  const overview = timeline
    ? `\n\nJak ostatnio się miewał (najnowsze pierwsze): ${timeline}. Po pełne treści sięgnij narzędziami. Pamiętaj: opisuj to słowami, nie liczbami.`
    : "";

  return `=== KONTEKST DZIENNIKA ===\n${focused}${overview}`;
}

// --- Narzędzia (function calling) -------------------------------------------

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_mood_timeline",
      description:
        "Zwraca, jak użytkownik czuł się w kolejnych dniach (samopoczucie opisane słowami) dla WSZYSTKICH wpisów. Użyj, gdy pytanie dotyczy tego, jak ostatnio się miewa lub jak zmienia się jego samopoczucie.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_entries",
      description:
        "Zwraca WSZYSTKIE wpisy użytkownika (data, nastrój, pełna treść). Użyj przy pytaniach ogólnych lub o wiele dni.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_entries",
      description:
        "Wyszukuje wpisy zawierające podany tekst (po treści). Użyj, gdy szukasz konkretnego tematu, osoby lub zdarzenia.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Szukana fraza." },
        },
        required: ["query"],
      },
    },
  },
];

/** Wykonuje pojedyncze wywołanie narzędzia na liście wpisów (w pamięci). */
export function runTool(call: ToolCall, entries: EntryForAgent[]): string {
  const name = call.function.name;
  let args: Record<string, unknown> = {};
  try {
    args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch {
    // Zignoruj — potraktuj jak brak argumentów.
  }

  switch (name) {
    case "get_mood_timeline":
      return JSON.stringify({
        wskazowka: "Opisuj samopoczucie słowami, nie liczbami.",
        dni: entries.map((e) => ({ dzien: e.day, samopoczucie: moodWord(e.mood) })),
      });
    case "get_all_entries":
      return JSON.stringify({
        wskazowka: "Opisuj samopoczucie słowami, nie liczbami.",
        wpisy: entries.map((e) => ({
          dzien: e.day,
          samopoczucie: moodWord(e.mood),
          tresc: e.text,
        })),
      });
    case "search_entries": {
      const q = String(args.query ?? "").toLowerCase();
      const hits = q
        ? entries.filter((e) => e.text.toLowerCase().includes(q))
        : [];
      return JSON.stringify({
        wskazowka: "Opisuj samopoczucie słowami, nie liczbami.",
        wpisy: hits.map((e) => ({
          dzien: e.day,
          samopoczucie: moodWord(e.mood),
          tresc: e.text,
        })),
      });
    }
    default:
      return JSON.stringify({ error: `Nieznane narzędzie: ${name}` });
  }
}

/** Czy wiadomość asystenta zawiera wywołania narzędzi. */
export function hasToolCalls(msg: ChatMessage): msg is ChatMessage & {
  tool_calls: ToolCall[];
} {
  return Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
}
