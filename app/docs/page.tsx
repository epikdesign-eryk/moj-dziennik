// Publiczna dokumentacja API „Mój Dziennik".
// - Każdy (także niezalogowany agent) widzi opis endpointów.
// - Zalogowany użytkownik dodatkowo dostaje panel generowania tokenów (PAT).

import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TokenPanel } from "@/components/token-panel";

export const dynamic = "force-dynamic";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t pt-6">
      <h3 className="flex flex-wrap items-center gap-2 font-mono text-sm">
        <span className="rounded bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
          {method}
        </span>
        <span className="font-semibold">{path}</span>
      </h3>
      <div className="mt-3 flex flex-col gap-3 text-sm">{children}</div>
    </section>
  );
}

export default async function DocsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const base = `${proto}://${host}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-24">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do aplikacji
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-semibold">API „Mój Dziennik”</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Trzy proste endpointy do programowego sterowania dziennikiem — dla
          deweloperów i agentów AI. Każdy działa per użytkownik, którego token go wywołuje.
        </p>
      </div>

      {/* Token panel albo zaproszenie do logowania */}
      <div className="mb-8">
        {user ? (
          <TokenPanel />
        ) : (
          <div className="rounded-xl border bg-card p-5 text-sm">
            <p className="font-medium">Chcesz wygenerować token?</p>
            <p className="mt-1 text-muted-foreground">
              Tokeny tworzysz po zalogowaniu.{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Zaloguj się
              </Link>
              , aby dostać własny Personal Access Token.
            </p>
          </div>
        )}
      </div>

      {/* Podstawy */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Podstawy</h2>
        <p className="text-sm text-muted-foreground">
          Adres bazowy: <code className="rounded bg-muted px-1.5 py-0.5">{base}</code>.
          Treść żądań i odpowiedzi to JSON (<code className="rounded bg-muted px-1.5 py-0.5">Content-Type: application/json</code>).
        </p>

        <h3 className="mt-2 font-semibold">Uwierzytelnianie</h3>
        <p className="text-sm text-muted-foreground">
          Dodaj nagłówek z Personal Access Tokenem (zaczyna się od{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">mdz_pat_</code>):
        </p>
        <CodeBlock>{`Authorization: Bearer mdz_pat_TWOJ_TOKEN`}</CodeBlock>
        <p className="text-sm text-muted-foreground">
          Alternatywnie, gdy apka woła API z przeglądarki, działa zwykła sesja
          (ciasteczko) — wtedy nagłówek nie jest potrzebny. Bez ważnego tokenu i
          bez sesji każdy endpoint zwraca <code className="rounded bg-muted px-1.5 py-0.5">401</code>.
        </p>

        <h3 className="mt-2 font-semibold">Błędy</h3>
        <ul className="ml-5 list-disc text-sm text-muted-foreground">
          <li><code className="rounded bg-muted px-1.5 py-0.5">400</code> — błędne dane wejściowe (np. zły format daty, pusty tekst).</li>
          <li><code className="rounded bg-muted px-1.5 py-0.5">401</code> — brak/zły token lub sesja.</li>
          <li><code className="rounded bg-muted px-1.5 py-0.5">502</code> — agent AI chwilowo niedostępny.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Daty są w formacie <code className="rounded bg-muted px-1.5 py-0.5">YYYY-MM-DD</code> (dzień
          liczony w strefie Europe/Warsaw). Pominięcie daty oznacza dziś.
        </p>
      </section>

      <div className="mt-8 flex flex-col gap-6">
        <h2 className="text-xl font-semibold">Endpointy</h2>

        <Endpoint method="POST" path="/api/entries">
          <p>Dodaje nowy wpis. Domyślnie na dziś. Nastrój opcjonalny — gdy go nie podasz, zostanie wywnioskowany z treści (skala 1–5).</p>
          <p className="font-medium">Body</p>
          <ul className="ml-5 list-disc text-muted-foreground">
            <li><code className="rounded bg-muted px-1.5 py-0.5">text</code> (string, wymagane) — treść wpisu.</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5">date</code> (string, opcjonalne) — dzień wpisu, domyślnie dziś.</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5">mood</code> (1–5, opcjonalne) — nastrój; brak ⇒ wnioskowany.</li>
          </ul>
          <p className="font-medium">Przykład</p>
          <CodeBlock>{`curl -X POST ${base}/api/entries \\
  -H "Authorization: Bearer mdz_pat_TWOJ_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Dziś był naprawdę dobry dzień, dużo energii.","date":"2026-06-05"}'`}</CodeBlock>
          <p className="font-medium">Odpowiedź 201</p>
          <CodeBlock>{`{
  "id": "…",
  "date": "2026-06-05T12:00:00Z",
  "mood": 4,
  "moodLabel": "Dobrze",
  "moodInferred": true,
  "text": "Dziś był naprawdę dobry dzień, dużo energii."
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/api/entries?date=YYYY-MM-DD">
          <p>Zwraca, co jest w danym dniu (domyślnie dziś): czy istnieje wpis, jaki nastrój i treść.</p>
          <p className="font-medium">Przykład</p>
          <CodeBlock>{`curl ${base}/api/entries?date=2026-06-05 \\
  -H "Authorization: Bearer mdz_pat_TWOJ_TOKEN"`}</CodeBlock>
          <p className="font-medium">Odpowiedź 200</p>
          <CodeBlock>{`{
  "date": "2026-06-05",
  "hasEntry": true,
  "count": 1,
  "entries": [
    {
      "createdAt": "2026-06-05T12:00:00Z",
      "mood": 4,
      "moodLabel": "Dobrze",
      "text": "Dziś był naprawdę dobry dzień, dużo energii."
    }
  ]
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/api/therapist">
          <p>Zadaje pytanie agentowi „psychoterapeucie”. Tekst wchodzi, tekst wychodzi. Kontekstem jest podany dzień (domyślnie dziś). Rozmowa jest zapisywana i pojawia się też w panelu czatu w aplikacji.</p>
          <p className="font-medium">Body</p>
          <ul className="ml-5 list-disc text-muted-foreground">
            <li><code className="rounded bg-muted px-1.5 py-0.5">question</code> (string, wymagane) — pytanie do agenta.</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5">date</code> (string, opcjonalne) — dzień kontekstu, domyślnie dziś.</li>
          </ul>
          <p className="font-medium">Przykład</p>
          <CodeBlock>{`curl -X POST ${base}/api/therapist \\
  -H "Authorization: Bearer mdz_pat_TWOJ_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Jak sobie ostatnio radzę?","date":"2026-06-05"}'`}</CodeBlock>
          <p className="font-medium">Odpowiedź 200</p>
          <CodeBlock>{`{ "answer": "Widzę, że ostatnie dni masz coraz lepsze…" }`}</CodeBlock>
        </Endpoint>
      </div>
    </main>
  );
}
