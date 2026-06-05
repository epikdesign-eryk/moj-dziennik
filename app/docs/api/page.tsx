// Dokumentacja REST API „Mój Dziennik" (podstrona /docs/api).

import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CodeBlock, TokenSection } from "@/components/docs-ui";

export const dynamic = "force-dynamic";

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
    <div className="border-t pt-6">
      <h3 className="flex flex-wrap items-center gap-2 font-mono text-sm">
        <span className="rounded bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
          {method}
        </span>
        <span className="font-semibold">{path}</span>
      </h3>
      <div className="mt-3 flex flex-col gap-3 text-sm">{children}</div>
    </div>
  );
}

export default async function DocsApiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const base = `${proto}://${host}`;

  return (
    <>
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
          <h1 className="text-3xl font-semibold">REST API</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Trzy proste endpointy do programowego sterowania dziennikiem — dla
          deweloperów i agentów AI. Każdy działa per użytkownik, którego token go
          wywołuje. Wolisz natywne podłączenie agenta?{" "}
          <Link
            href="/docs/mcp"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Zobacz MCP
          </Link>
          .
        </p>
      </div>

      <div className="mb-8">
        <TokenSection loggedIn={!!user} />
      </div>

      <section id="podstawy" className="flex scroll-mt-8 flex-col gap-3">
        <h2 className="text-xl font-semibold">Podstawy</h2>
        <p className="text-sm text-muted-foreground">
          Adres bazowy:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">{base}</code>. Treść
          żądań i odpowiedzi to JSON (
          <code className="rounded bg-muted px-1.5 py-0.5">
            Content-Type: application/json
          </code>
          ).
        </p>
        <p className="text-sm text-muted-foreground">
          Daty są w formacie{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">YYYY-MM-DD</code>{" "}
          (dzień liczony w strefie Europe/Warsaw). Pominięcie daty oznacza dziś.
        </p>
      </section>

      <section
        id="uwierzytelnianie"
        className="mt-8 flex scroll-mt-8 flex-col gap-3"
      >
        <h2 className="text-xl font-semibold">Uwierzytelnianie</h2>
        <p className="text-sm text-muted-foreground">
          Dodaj nagłówek z Personal Access Tokenem (zaczyna się od{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">mdz_pat_</code>):
        </p>
        <CodeBlock>{`Authorization: Bearer mdz_pat_TWOJ_TOKEN`}</CodeBlock>
        <p className="text-sm text-muted-foreground">
          Alternatywnie, gdy apka woła API z przeglądarki, działa zwykła sesja
          (ciasteczko) — wtedy nagłówek nie jest potrzebny. Bez ważnego tokenu i
          bez sesji każdy endpoint zwraca{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">401</code>.
        </p>
        <h3 className="mt-2 font-semibold">Kody błędów</h3>
        <ul className="ml-5 list-disc text-sm text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5">400</code> — błędne
            dane wejściowe (np. zły format daty, pusty tekst).
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5">401</code> —
            brak/zły token lub sesja.
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5">502</code> — agent
            AI chwilowo niedostępny.
          </li>
        </ul>
      </section>

      <section id="endpointy" className="mt-8 flex scroll-mt-8 flex-col gap-6">
        <h2 className="text-xl font-semibold">Endpointy</h2>

        <Endpoint method="POST" path="/api/entries">
          <p>
            Dodaje nowy wpis. Domyślnie na dziś. Nastrój opcjonalny — gdy go nie
            podasz, zostanie wywnioskowany z treści (skala 1–5).
          </p>
          <p className="font-medium">Body</p>
          <ul className="ml-5 list-disc text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">text</code>{" "}
              (string, wymagane) — treść wpisu.
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">date</code>{" "}
              (string, opcjonalne) — dzień wpisu, domyślnie dziś.
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">mood</code> (1–5,
              opcjonalne) — nastrój; brak ⇒ wnioskowany.
            </li>
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
          <p>
            Zwraca, co jest w danym dniu (domyślnie dziś): czy istnieje wpis,
            jaki nastrój i treść.
          </p>
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
          <p>
            Zadaje pytanie agentowi-psychoterapeucie. Tekst wchodzi, tekst
            wychodzi. Kontekstem jest podany dzień (domyślnie dziś). Rozmowa jest
            zapisywana i pojawia się też w panelu czatu w aplikacji.
          </p>
          <p className="font-medium">Body</p>
          <ul className="ml-5 list-disc text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">question</code>{" "}
              (string, wymagane) — pytanie do agenta.
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">date</code>{" "}
              (string, opcjonalne) — dzień kontekstu, domyślnie dziś.
            </li>
          </ul>
          <p className="font-medium">Przykład</p>
          <CodeBlock>{`curl -X POST ${base}/api/therapist \\
  -H "Authorization: Bearer mdz_pat_TWOJ_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Jak sobie ostatnio radzę?","date":"2026-06-05"}'`}</CodeBlock>
          <p className="font-medium">Odpowiedź 200</p>
          <CodeBlock>{`{ "answer": "Widzę, że ostatnie dni masz coraz lepsze…" }`}</CodeBlock>
        </Endpoint>
      </section>
    </>
  );
}
