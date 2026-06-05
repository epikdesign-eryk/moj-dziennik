---
name: dodaj-wpis
description: Dodaj nowy wpis do dziennika „Mój Dziennik" na konkretny dzień (domyślnie dziś). Użyj, gdy użytkownik chce zapisać wpis, notatkę albo przemyślenia z danego dnia, opowiada jak minął mu dzień, albo prosi o dodanie wpisu do dziennika. Skill sam wnioskuje nastrój (1–5) z treści i po zapisie weryfikuje, że wpis trafił do bazy.
---

# Dodaj wpis do dziennika

Dodajesz nowy wiersz do tabeli `public.entries` w Supabase (projekt **moj-dziennik**)
przez narzędzia MCP Supabase. Wpis należy do jednego użytkownika; treść jest HTML‑em
(edytor TipTap), a `created_at` pełni rolę **daty dnia** wpisu.

## Stałe projektu

- **project_id**: `urucvunzbfojotfgkngr`
- **tabela**: `public.entries`
- Kolumny, które ustawiasz:
  - `content` — treść w HTML (akapity w `<p>…</p>`)
  - `mood` — `smallint` 1–5 (Ty wnioskujesz, patrz niżej)
  - `created_at` — `timestamptz` = dzień wpisu
  - `user_id` — `uuid` właściciela (rozwiązujesz w kroku 1)
  - `title` ma domyślnie `''` i UI go nie używa — **nie ustawiaj**.

> Uwaga: `execute_sql` przez MCP omija RLS i `auth.uid()` jest `NULL`,
> dlatego `user_id` musisz podać jawnie.

## Procedura

### 1. Ustal `user_id` (KRYTYCZNE)
W bazie jest **kilka kont**. Apka przez RLS pokazuje wpis tylko jego właścicielowi,
więc jeśli trafisz w złe konto, wpis zapisze się, ale **nie pojawi się w apce**.
Dlatego nie zgaduj — ustal konto pewnie:

1. Zapytaj użytkownika o **e‑mail, którym loguje się do „Mój Dziennik"** (chyba że
   już go podał w rozmowie).
2. Rozwiąż `user_id` jednym celnym zapytaniem (bez zrzucania cudzych danych):

   ```sql
   select id from auth.users where lower(email) = lower('<EMAIL>') limit 1;
   ```

3. Jeśli zapytanie nic nie zwróci — powiedz o tym i poproś o poprawny e‑mail.
   Nie wstawiaj wpisu „na chybił trafił".

### 2. Ustal datę dnia
- Domyślnie: **dzisiaj** (użyj dzisiejszej daty z kontekstu sesji).
- Jeśli użytkownik wskazał inny dzień („wczoraj", „3 czerwca", konkretna data) —
  użyj go. Format docelowy: `YYYY-MM-DD`.
- Konwersja na `created_at`:
  - **dziś** → użyj `now()`,
  - **inny dzień** → ustaw **południe czasu warszawskiego**, żeby wpis na pewno
    wylądował we właściwym dniu lokalnie: `'YYYY-MM-DDT12:00:00+02:00'`.

### 3. Zbierz treść
Treść bierzesz z tego, co napisał użytkownik (jego słowa, lekko uporządkowane —
nie zmyślaj faktów). Zapisz jako HTML: każdy akapit w `<p>…</p>`. Zadbaj o
escapowanie apostrofów w SQL (podwój `'` → `''`).

### 4. Wywnioskuj nastrój (`mood`)
Oceń wydźwięk treści i zmapuj na skalę 1–5 (zgodną z `MOODS` w aplikacji):

| mood | emoji | znaczenie | sygnały w treści |
|------|-------|-----------|------------------|
| 1 | 😞 | Źle | rozpacz, kryzys, „najgorszy dzień", strata, silny lęk |
| 2 | 🙁 | Słabo | zmęczenie, zniechęcenie, smutek, frustracja |
| 3 | 😐 | Tak sobie | dzień jak co dzień, mieszane uczucia, neutralnie |
| 4 | 🙂 | Dobrze | zadowolenie, drobne sukcesy, spokój, wdzięczność |
| 5 | 😄 | Świetnie | radość, duma, ekscytacja, wyjątkowo dobry dzień |

Kieruj się **słowami i emocjami**, nie liczbą wydarzeń. Gdy treść jest naprawdę
neutralna lub niejednoznaczna — daj `3`. Krótko powiedz użytkownikowi, jaki
nastrój przypisałeś i dlaczego (jednym zdaniem).

### 5. Zapisz wpis
Jednym `execute_sql` wstaw wiersz i od razu odbierz go przez `RETURNING`:

```sql
insert into public.entries (user_id, content, mood, created_at)
values (
  '<USER_ID>',
  '<HTML_TREŚCI>',
  <MOOD>,
  '<CREATED_AT>'   -- albo now() dla dziś
)
returning id, created_at, mood, left(content, 80) as content_preview;
```

### 6. Zweryfikuj zapis
Po wstawieniu **potwierdź niezależnym `SELECT`-em**, że wpis faktycznie jest w
bazie z poprawnym dniem i nastrojem:

```sql
select id, created_at, mood, left(content, 80) as content_preview
from public.entries
where id = '<ID_Z_RETURNING>';
```

Sprawdź, że:
- wiersz istnieje (dokładnie 1),
- `mood` zgadza się z tym, co wywnioskowałeś,
- dzień z `created_at` (w czasie warszawskim) zgadza się z datą docelową.

Jeśli się zgadza — potwierdź użytkownikowi: dzień, nastrój (emoji + etykieta) i
`id`. Jeśli coś się nie zgadza lub `INSERT` zwrócił błąd — **nie udawaj sukcesu**,
pokaż błąd i zaproponuj poprawkę.
