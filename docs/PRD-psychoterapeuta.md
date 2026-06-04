# PRD — Cyfrowy psychoterapeuta („Anthony Robbins")

**Produkt:** Mój Dziennik (Next.js 16 + Supabase)
**Funkcja:** Agent AI do rozmowy o wpisach w dzienniku
**Data:** 2026-06-04
**Status:** Draft do akceptacji
**Etap projektu:** Etap 3 (po: wpisy w Supabase + logowanie)

---

## 1. Streszczenie

Dodajemy do aplikacji konwersacyjnego agenta AI, który pełni rolę „prywatnego
psychoterapeuty / coacha". Użytkownik rozmawia z nim przez istniejący dolny
pasek (bottom bar, [`components/ai-bar.tsx`](../components/ai-bar.tsx)) — dziś
czysto wizualny. Agent ma dostęp do wpisów dziennika (treść + nastrój) i potrafi
analizować, jak zmienia się nastrój i jak wyglądają dni użytkownika.

Pierwsza persona: **Anthony Robbins** — ton będący miksem ciepłej empatii
i motywacyjnego „kopa" do działania.

---

## 2. Cele i sukces

### Cele
- Dać użytkownikowi przestrzeń do refleksji nad swoimi wpisami w formie rozmowy.
- Wyciągać wnioski o trendach nastroju i wzorcach w dniach.
- Motywować do działania w duchu Anthony'ego Robbinsa, zachowując empatię.

### Metryki sukcesu (MVP)
- Użytkownik potrafi zadać pytanie i dostać trafną odpowiedź odnoszącą się do
  jego realnych wpisów (a nie ogólniki).
- Czas do pierwszej odpowiedzi < ~3 s dla pytań o jeden dzień.
- Agent poprawnie rozróżnia pytania „o ten dzień" vs „o całość" w ≥ 90% przypadków.

### Poza zakresem (na teraz)
- Wejście głosowe / dyktowanie (ikona mikrofonu pozostaje nieaktywna).
- Streaming odpowiedzi token-po-tokenie.
- Wiele person do wyboru (architektura ma to umożliwić, ale UI wybiera tylko Robbinsa).
- Załączniki / zdjęcia w rozmowie.

---

## 3. Persona agenta — Anthony Robbins

**Styl:** mix empatii i motywacyjnego pchnięcia do działania.

1. **Najpierw słucha i waliduje emocje** — odnosi się do tego, co użytkownik
   realnie napisał, nazywa emocje, pokazuje zrozumienie.
2. **Potem motywuje** — zadaje mocne pytania o wartości i cele, proponuje
   konkretny mały krok („massive action"), używa energetycznego, bezpośredniego
   języka Robbinsa.
3. **Nie ocenia, nie moralizuje.** Mówi po polsku, na „ty", ciepło ale
   konkretnie.
4. **Opiera się na danych** — cytuje/parafrazuje realne wpisy i nastroje, nie
   zmyśla zdarzeń.

Persona definiowana jest jako **system prompt** trzymany po stronie serwera
(łatwo podmienialny → przyszłe persony).

---

## 4. Kontekst danych (kluczowa mechanika)

Agent zna **dwa źródła kontekstu** i sam decyduje, którego użyć:

### 4.1 Aktualnie otwarty dzień
- Z kontekstu [`useSelectedDay`](../lib/selected-day.tsx) (`selectedDay` =
  `YYYY-MM-DD`) wiemy, na który dzień użytkownik aktualnie patrzy.
- Ten dzień (jego wpis/wpisy: treść + nastrój) jest **zawsze** dołączany do
  zapytania jako „dzień w fokusie".

### 4.2 Wszystkie wpisy
- Pełna historia z tabeli `entries` (treść + `mood` + `created_at`).
- Dociągana **tylko gdy potrzeba** — patrz niżej.

### 4.3 Automatyczny wybór zakresu (function calling / tools)
Agent decyduje sam na podstawie treści pytania, używając **narzędzi (tools)**
modelu Grok:

- Pytanie odnoszące się do bieżącego dnia („czemu dziś czuję się gorzej?",
  „co z tym zrobić?") → odpowiada z kontekstu otwartego dnia, **bez** ładowania
  całej historii (szybciej, taniej).
- Pytanie ogólne / o trend („jak zmieniał się mój nastrój w tym miesiącu?",
  „kiedy bywam najszczęśliwszy?") → wywołuje narzędzie po pełną historię.

**Narzędzia eksponowane modelowi (propozycja):**
| Narzędzie | Opis | Zwraca |
|---|---|---|
| `get_focused_day` | Wpis(y) aktualnie otwartego dnia | treść + mood + data |
| `get_entries_range(from, to)` | Wpisy z zakresu dat | lista wpisów |
| `get_mood_timeline(from?, to?)` | Szereg czasowy nastroju | `[{date, mood}]` |
| `search_entries(query)` | Wyszukiwanie po treści | dopasowane wpisy |

> **Nastrój (mood 1–5) to pełnoprawny sygnał.** Agent dostaje wartości nastroju
> osobno (nie tylko z treści) i potrafi analizować trendy, spadki/wzrosty
> i korelować je z treścią wpisów. `get_mood_timeline` służy dokładnie temu.

> Uwaga implementacyjna: ze względu na koszt/latencję, do startowego
> system-promptu wstrzykujemy jedynie **lekki zarys** (otwarty dzień + skrócona
> oś nastroju), a pełne treści agent dociąga narzędziami na żądanie.

---

## 5. Model AI — Grok 4.1 Fast

- **Dostawca:** xAI, model **Grok 4.1 Fast** (wskazany przez użytkownika:
  https://x.ai/news/grok-4-1-fast).
- **Dlaczego:** szybki, tani, duże okno kontekstu, natywne wsparcie dla
  function/tool calling i trybu agentowego — idealne do mechaniki z sekcji 4.
- **Dostęp:** API xAI (endpoint zgodny z OpenAI, `https://api.x.ai/v1`),
  wołane **po stronie serwera**, żeby ukryć klucz API.

> ⚠️ **Do zweryfikowania przy implementacji** (strona x.ai blokuje automatyczne
> pobranie — HTTP 403): dokładne ID modelu (prawdopodobnie warianty
> `grok-4-1-fast-reasoning` / `grok-4-1-fast-non-reasoning`), limit okna
> kontekstu, cennik, format Agent Tools API oraz czy używamy SDK OpenAI-compat
> czy dedykowanego SDK xAI. Klucz w zmiennej środowiskowej `XAI_API_KEY`.

### Gdzie żyje wywołanie
Decyzja do potwierdzenia na etapie technicznym — dwie opcje spójne ze stackiem:
- **Next.js Route Handler** (`app/api/chat/route.ts`) — prościej, blisko reszty
  appki, łatwy dostęp do sesji Supabase.
- **Supabase Edge Function** — spójne z kierunkiem „logika na Supabase".

Rekomendacja: **Next.js Route Handler** dla MVP (mniej ruchomych części,
dane i tak są w Supabase, a route ma dostęp do sesji użytkownika).

---

## 6. Trwałość rozmowy — model „per dzień"

Każdy dzień ma **własny wątek rozmowy**, powiązany z otwartym dniem
(`YYYY-MM-DD`). Otworzenie danego dnia pokazuje historię rozmowy z tego dnia.

### Propozycja schematu (Supabase)
Nowa tabela `chat_messages` (RLS jak w `entries` — user widzi tylko swoje):

```
chat_messages
  id          uuid    pk
  user_id     uuid    fk -> auth.users  (RLS: auth.uid() = user_id)
  day         date    -- YYYY-MM-DD, dzień którego dotyczy wątek
  role        text    -- 'user' | 'assistant'
  content     text
  created_at  timestamptz default now()
```

- Wątek = wszystkie `chat_messages` danego `user_id` + `day`, sortowane po `created_at`.
- Historię wątku dołączamy do zapytania do modelu (kontekst rozmowy).

---

## 7. UX / interfejs

### 7.1 Punkt wejścia — bottom bar
- Bazujemy na istniejącym [`AiBar`](../components/ai-bar.tsx).
- Aktywujemy przycisk **wyślij** (dziś jest ikona mikrofonu — w MVP zamieniamy
  na „wyślij"/strzałkę; mikrofon wraca przy etapie głosowym).
- Pasek nadal ukryty na trasach `/new` i `/login`.

### 7.2 Rozwijany panel rozmowy (nad paskiem)
- Wysłanie pytania **rozwija panel nad bottom barem** z historią rozmowy
  bieżącego dnia (dymki user/asystent). Pasek zostaje na dole.
- Użytkownik zostaje w kontekście wpisu (nie przechodzi na osobny ekran).
- Panel można zwinąć; na desktopie respektuje offset `lg:left-[22rem]`
  (panel boczny), tak jak obecny pasek.
- Stan ładowania: wskaźnik „pisze…" do czasu odpowiedzi (MVP bez streamingu —
  odpowiedź pojawia się w całości).

### 7.3 Zmiana dnia
- Zmiana `selectedDay` przełącza widoczny wątek na rozmowę z tego dnia.

---

## 8. Bezpieczeństwo i zdrowie psychiczne

To produkt dotykający emocji — wymaga warstwy ochronnej.

### 8.1 Disclaimer
- Widoczna, jednorazowa (i dostępna w panelu) informacja: *„To wsparcie AI,
  nie zastępuje kontaktu z profesjonalnym psychoterapeutą ani pomocy medycznej."*

### 8.2 Wykrywanie kryzysu
- Jeśli treść użytkownika sygnalizuje kryzys (myśli samobójcze, samookaleczenie,
  przemoc), agent:
  1. reaguje empatycznie i z troską (nie ignoruje, nie ocenia),
  2. **wyświetla numery pomocowe** (PL): np. 112, Telefon Zaufania 116 123,
     Telefon Zaufania dla Dzieci i Młodzieży 116 111,
  3. zachęca do kontaktu z bliską osobą / specjalistą,
  4. nie udziela porad medycznych.
- Mechanizm: instrukcja w system-prompcie + lekka detekcja po stronie serwera
  (lista słów-kluczy → wstrzyknięcie modułu kryzysowego do promptu).

### 8.3 Prywatność
- Wpisy to dane wrażliwe. Do modelu wysyłamy **tylko dane zalogowanego
  użytkownika**, wyłącznie na czas zapytania.
- Klucz API nigdy nie trafia do klienta (wywołanie serwerowe).
- RLS w Supabase gwarantuje izolację danych między użytkownikami.

---

## 9. Wymagania funkcjonalne (MVP)

| # | Wymaganie |
|---|---|
| F1 | Aktywny pasek: użytkownik wpisuje pytanie tekstem i wysyła. |
| F2 | Pytanie + kontekst otwartego dnia trafia do Grok 4.1 Fast (serwerowo). |
| F3 | Agent automatycznie decyduje (tools), czy doładować pełną historię/oś nastroju. |
| F4 | Odpowiedź w personie Anthony'ego Robbinsa (empatia + motywacja), po polsku. |
| F5 | Rozmowa wyświetla się w rozwijanym panelu nad paskiem. |
| F6 | Wątek rozmowy zapisywany per dzień w `chat_messages` (Supabase, RLS). |
| F7 | Zmiana otwartego dnia przełącza widoczny wątek. |
| F8 | Disclaimer + obsługa sygnałów kryzysowych (numery pomocowe). |
| F9 | Mood (1–5) dostępny agentowi jako osobny sygnał do analizy trendów. |

## 10. Wymagania niefunkcjonalne
- Latencja pierwszej odpowiedzi: cel < 3 s dla pytań o jeden dzień.
- Klucz API tylko serwerowo; brak wycieku danych między użytkownikami.
- Graceful error: błąd modelu/sieci → czytelny komunikat, brak utraty wpisanej treści.

---

## 11. Otwarte kwestie do potwierdzenia
1. Szczegóły Grok API (dokładne ID modelu, cennik, format tools, SDK) — do
   weryfikacji w dokumentacji xAI przy implementacji.
2. Route Handler vs Edge Function (rekomendacja: Route Handler).
3. Czy „dzień" może mieć >1 wpis — wtedy `get_focused_day` zwraca listę.
4. Limit długości historii wątku wysyłanej do modelu (okno kontekstu / koszt).
5. Treść i dobór numerów pomocowych (lokalizacja PL — potwierdzić aktualne).

---

## 12. Roadmapa (po MVP)
- Streaming odpowiedzi (token-po-tokenie).
- Wejście głosowe (reaktywacja ikony mikrofonu, Web Speech API / transkrypcja).
- Wiele person do wyboru (Robbins to pierwsza z wielu).
- Proaktywne podsumowania (np. cotygodniowy raport nastroju).
- Załączniki / analiza zdjęć z wpisów.
