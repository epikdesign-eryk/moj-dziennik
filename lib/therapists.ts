// Katalog person agenta-„psychoterapeuty". Jedno źródło prawdy współdzielone
// przez klienta (picker, avatar, mini-lista) i serwer (checkout, dostęp, prompty).
//
// UWAGA: ten plik nie zawiera promptów person (te są serwerowo w lib/therapist.ts).
// Tu trzymamy tylko metadane bezpieczne do wysłania na klienta.

export interface Therapist {
  /** Stabilne id używane w bazie, API i Stripe (metadata). */
  id: string;
  /** Imię i nazwisko pokazywane w UI. */
  name: string;
  /** Inicjały na avatarze (np. „AR"). */
  initials: string;
  /** Klasy Tailwind tła + tekstu avatara. */
  avatarBg: string;
  /** Podtytuł w nagłówku czatu. */
  tagline: string;
  /** Krótki opis w pickerze. */
  blurb: string;
  /** Czy darmowy (domyślny dla każdego konta). */
  free: boolean;
  /** Cena w groszach (dla płatnych). 0 dla darmowych. */
  priceGrosze: number;
  /** Etykieta ceny do UI (np. „2 zł"). */
  priceLabel: string;
}

export const DEFAULT_THERAPIST_ID = "robbins";

export const THERAPISTS: Therapist[] = [
  {
    id: "robbins",
    name: "Anthony Robbins",
    initials: "AR",
    avatarBg: "bg-gradient-to-br from-amber-300 to-orange-500 text-stone-900",
    tagline: "Twój przewodnik",
    blurb: "Empatia i motywacyjny kop. Domyślny przewodnik.",
    free: true,
    priceGrosze: 0,
    priceLabel: "W zestawie",
  },
  {
    id: "goggins",
    name: "David Goggins",
    initials: "DG",
    avatarBg: "bg-gradient-to-br from-orange-400 to-orange-600 text-stone-900",
    tagline: "Twój przewodnik",
    blurb: "Brutalna szczerość i „stay hard”. Bez wymówek.",
    free: false,
    priceGrosze: 200,
    priceLabel: "2 zł",
  },
  {
    id: "nietzsche",
    name: "Friedrich Nietzsche",
    initials: "FN",
    avatarBg: "bg-gradient-to-br from-amber-200 to-amber-400 text-stone-900",
    tagline: "Twój przewodnik",
    blurb: "Refleksja, „amor fati”, siła z cierpienia.",
    free: false,
    priceGrosze: 200,
    priceLabel: "2 zł",
  },
];

/** Zwraca personę po id albo undefined. */
export function getTherapist(id: string): Therapist | undefined {
  return THERAPISTS.find((t) => t.id === id);
}

/** Waliduje id persony; nieznane/puste → domyślna (Robbins). */
export function resolveTherapistId(raw: unknown): string {
  return typeof raw === "string" && THERAPISTS.some((t) => t.id === raw)
    ? raw
    : DEFAULT_THERAPIST_ID;
}
