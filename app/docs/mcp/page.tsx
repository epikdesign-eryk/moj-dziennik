// Dokumentacja serwera MCP „Mój Dziennik" (podstrona /docs/mcp).

import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Boxes } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CodeBlock, TokenSection } from "@/components/docs-ui";

export const dynamic = "force-dynamic";

function Tool({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-6">
      <h3 className="font-mono text-sm font-semibold">{name}</h3>
      <div className="mt-2 flex flex-col gap-2 text-sm">{children}</div>
    </div>
  );
}

export default async function DocsMcpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const base = `${proto}://${host}`;
  const mcpUrl = `${base}/api/mcp`;

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
          <Boxes className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-semibold">Serwer MCP</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Podłącz agenta AI (Claude, Cursor, Claude Code) do dziennika natywnie —
          bez ręcznych wywołań HTTP. Wolisz zwykłe REST?{" "}
          <Link
            href="/docs/api"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Zobacz API
          </Link>
          .
        </p>
      </div>

      <div className="mb-8">
        <TokenSection loggedIn={!!user} />
      </div>

      <section id="czym-jest" className="flex scroll-mt-8 flex-col gap-3">
        <h2 className="text-xl font-semibold">Czym jest MCP</h2>
        <p className="text-sm text-muted-foreground">
          MCP (Model Context Protocol) to standard, dzięki któremu agent AI
          „widzi” Twój dziennik jako zestaw gotowych narzędzi i może z nich
          korzystać sam — np. dodać wpis albo zapytać psychoterapeutę — zamiast
          ręcznie składać zapytania HTTP.
        </p>
        <p className="text-sm text-muted-foreground">
          Serwer działa po HTTP (transport <em>Streamable HTTP</em>) i
          uwierzytelnia się tym samym Personal Access Tokenem co REST API.
        </p>
      </section>

      <section id="polaczenie" className="mt-8 flex scroll-mt-8 flex-col gap-3">
        <h2 className="text-xl font-semibold">Połączenie</h2>
        <p className="text-sm text-muted-foreground">Adres serwera MCP:</p>
        <CodeBlock>{mcpUrl}</CodeBlock>

        <h3 className="mt-2 font-semibold">Klient z plikiem konfiguracyjnym</h3>
        <p className="text-sm text-muted-foreground">
          Np. Claude Desktop / Cursor — dodaj wpis do konfiguracji MCP (token w
          nagłówku):
        </p>
        <CodeBlock>{`{
  "mcpServers": {
    "moj-dziennik": {
      "type": "http",
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer mdz_pat_TWOJ_TOKEN"
      }
    }
  }
}`}</CodeBlock>

        <h3 className="mt-2 font-semibold">Claude Code (CLI)</h3>
        <CodeBlock>{`claude mcp add --transport http moj-dziennik ${mcpUrl} \\
  --header "Authorization: Bearer mdz_pat_TWOJ_TOKEN"`}</CodeBlock>
        <p className="text-sm text-muted-foreground">
          Bez ważnego tokenu serwer zwraca{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">401</code>. Token
          wygenerujesz w panelu wyżej (po zalogowaniu).
        </p>
      </section>

      <section id="narzedzia" className="mt-8 flex scroll-mt-8 flex-col gap-6">
        <h2 className="text-xl font-semibold">Narzędzia</h2>
        <p className="text-sm text-muted-foreground">
          Po podłączeniu agent dostaje trzy narzędzia (działają per Twoje konto):
        </p>

        <Tool name="add_journal_entry">
          <p className="text-muted-foreground">
            Dodaje wpis. Domyślnie na dziś; brak nastroju ⇒ wnioskowany z treści.
          </p>
          <ul className="ml-5 list-disc text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">text</code>{" "}
              (wymagane) — treść wpisu.
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">date</code>{" "}
              (opcjonalne) — YYYY-MM-DD.
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">mood</code>{" "}
              (opcjonalne) — 1–5.
            </li>
          </ul>
        </Tool>

        <Tool name="get_journal_day">
          <p className="text-muted-foreground">
            Zwraca wpisy z danego dnia (domyślnie dziś): czy są, nastrój i treść.
          </p>
          <ul className="ml-5 list-disc text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">date</code>{" "}
              (opcjonalne) — YYYY-MM-DD.
            </li>
          </ul>
        </Tool>

        <Tool name="ask_therapist">
          <p className="text-muted-foreground">
            Zadaje pytanie agentowi-psychoterapeucie w kontekście danego dnia.
            Rozmowa jest zapisywana.
          </p>
          <ul className="ml-5 list-disc text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">question</code>{" "}
              (wymagane) — pytanie.
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">date</code>{" "}
              (opcjonalne) — YYYY-MM-DD.
            </li>
          </ul>
        </Tool>
      </section>
    </>
  );
}
