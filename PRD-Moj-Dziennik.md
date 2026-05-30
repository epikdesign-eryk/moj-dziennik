# PRD — „Mój Dziennik"

> Wersja: 0.1 (Etap 1 — pierwsza skorupa)
> Data: 2026-05-29
> Status: Do realizacji

---

## 🧭 Kontekst

Aplikacja **„Mój Dziennik"** to osobista aplikacja do prowadzenia dziennika. Obecnie **nie istnieje** — budujemy ją od zera.

To jest **Etap 1**, którego celem jest stworzenie *pierwszej skorupy* (MVP) — działającego szkieletu, który pozwoli na dodawanie wpisów i gromadzenie ich w jednym miejscu.

W kolejnych etapach (poza zakresem tego dokumentu) planowane jest dobudowanie:
- **bazy danych** do trwałego przechowywania wpisów,
- **modułu AI**, który będzie analizował wpisy i dostarczał podsumowania oraz wglądy (insights).

Założenia techniczne Etapu 1:
- **Platforma:** aplikacja webowa (przeglądarka).
- **Framework:** **Next.js** (**React**).
- **UI / komponenty:** biblioteka **shadcn/ui** (komponenty oparte na Radix + Tailwind CSS).
- **Edytor tekstu:** **TipTap** ([tiptap.dev](https://tiptap.dev/)) — używany na ekranie dodawania/edycji treści wpisu (rich text).
- **Przechowywanie:** wyłącznie lokalnie na komputerze użytkownika (np. `localStorage` przeglądarki). **Brak backendu i bazy danych.** Wpisy mają przetrwać odświeżenie i ponowne otwarcie aplikacji.
- **Brak logowania / kont użytkowników** — aplikacja jednoosobowa, lokalna.

---

## 🎯 Cel

Zbudować działający prototyp aplikacji webowej z **trzema ekranami**, który umożliwi:

1. **Dodawanie wpisu na dzisiaj** — szybkie zapisanie przemyśleń z bieżącego dnia.
2. **Przeglądanie listy wpisów** — zobaczenie wszystkich zapisanych wpisów w jednym miejscu.
3. **Przeglądanie pojedynczego wpisu z przeszłości** — otwarcie i odczytanie konkretnego, wcześniejszego wpisu.

**Definicja sukcesu Etapu 1:**
Użytkownik może dodać wpis, zobaczyć go na liście, otworzyć go ponownie, a po odświeżeniu/zamknięciu przeglądarki wpisy nadal tam są (zapis lokalny).

### Zakres pojedynczego wpisu
Każdy wpis składa się z:
- **Tytuł** (pole tekstowe),
- **Treść** (dłuższy tekst),
- **Data** (ustawiana automatycznie na dzień dodania),
- **Nastrój / mood** (wybór z kilku emoji, np. 😞 🙁 😐 🙂 😄),
- **Zdjęcie / obraz** (opcjonalne dołączenie obrazu do wpisu).

---

## 🖼️ Referencja

**Główna referencja wizualna: aplikacja „5 Minute Journal" na iOS** (dwa załączone screenshoty). Odwzorowujemy jej styl: jasny, ciepły, minimalistyczny, z akcentem w kolorze żółtym/pomarańczowym.

Elementy z referencji, do których się odnosimy:

- **Ekran główny** z nagłówkiem „Good morning, Alex!" oraz dużym przyciskiem **„Start Today's Journal"** → odpowiednik naszego ekranu dodawania wpisu.
- **Lista wpisów** z datami i krótkim podglądem treści (np. „October 2022", wpisy z dnia) → odpowiednik naszego ekranu listy.
- **Widok pojedynczego wpisu / edytora** z treścią i dołączonym zdjęciem → odpowiednik naszego ekranu podglądu wpisu.
- **Wybór nastroju** (rząd emoji: 😞 🙁 😐 🙂 😄 z podpisem „Great!") → nasz selektor mood.
- **Insights / Mood over time** — wykresy nastroju w czasie → **poza zakresem Etapu 1** (przyszły etap z AI).

Kierunek estetyczny do odwzorowania:
- jasne, kremowe tło,
- typografia serif w nagłówkach,
- zaokrąglone karty i przyciski,
- żółty/pomarańczowy kolor akcentujący (CTA, aktywne stany).

---

## 🗂️ Specyfikacja ekranów

### Ekran 1 — Dodawanie wpisu na dzisiaj
- Automatycznie wyświetlana dzisiejsza data.
- Pole **Tytuł**.
- Pole **Treść** — edytor **TipTap** (rich text, wieloliniowy).
- Selektor **Nastroju** (emoji).
- Możliwość **dodania zdjęcia** (opcjonalnie).
- Przycisk **Zapisz** → zapisuje wpis lokalnie i przenosi do listy (lub czyści formularz).

### Ekran 2 — Lista wpisów
- Lista wszystkich wpisów posortowana od najnowszego do najstarszego.
- Każdy element listy pokazuje: datę, tytuł, ikonę nastroju i krótki fragment treści (oraz miniaturę zdjęcia, jeśli jest).
- Kliknięcie elementu → przejście do Ekranu 3 (podgląd).
- Widoczny sposób przejścia do Ekranu 1 (np. przycisk „+" / „Dodaj wpis").

### Ekran 3 — Podgląd poprzedniego wpisu
- Pełna treść wybranego wpisu: tytuł, data, nastrój, treść, zdjęcie.
- Możliwość powrotu do listy.
- (Edycja/usuwanie — opcjonalnie w tym etapie, *nice to have*).

---

## 🚫 Poza zakresem (Etap 1)

- Baza danych i backend.
- Synchronizacja między urządzeniami / chmura.
- Konta użytkowników i logowanie.
- Moduł AI i podsumowania (Insights, Mood over time).
- Powiadomienia, przypomnienia, medytacje, cytaty dnia.

---

## ✅ Następne kroki

1. **Zatwierdzenie PRD** — potwierdzenie zakresu Etapu 1.
2. **Konfiguracja stacku** — projekt **Next.js** (React) + **shadcn/ui** (Tailwind) + integracja edytora **TipTap**, dane w `localStorage`.
3. **Projekt struktury danych wpisu** — model: `{ id, data, tytuł, treść, nastrój, zdjęcie }`.
4. **Implementacja Ekranu 1** (dodawanie wpisu + zapis lokalny).
5. **Implementacja Ekranu 2** (lista wpisów z odczytem z pamięci lokalnej).
6. **Implementacja Ekranu 3** (podgląd pojedynczego wpisu).
7. **Stylizacja** zgodnie z referencjami (jasny motyw, żółty akcent).
8. **Test ręczny** pełnej ścieżki: dodaj → zobacz na liście → otwórz → odśwież i sprawdź trwałość.
9. **Przegląd i planowanie Etapu 2** (baza danych, a następnie AI).
