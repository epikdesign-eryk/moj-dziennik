"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TokenRow {
  id: string;
  name: string | null;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

/**
 * Panel zarządzania Personal Access Tokenami. Renderowany na /docs tylko dla
 * zalogowanego użytkownika. Plaintext nowego tokenu pokazujemy raz.
 */
export function TokenPanel() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return fetch("/api/tokens")
      .then((r) => (r.ok ? r.json() : { tokens: [] }))
      .then((d) => setTokens(d.tokens ?? []));
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate() {
    setPending(true);
    setError(null);
    setFresh(null);
    setCopied(false);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się utworzyć tokenu.");
        return;
      }
      setFresh(data.token);
      setName("");
      await load();
    } catch {
      setError("Błąd sieci. Spróbuj ponownie.");
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/tokens?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) await load();
  }

  async function copy() {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Twoje tokeny API</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Wygeneruj token i podaj go deweloperowi lub agentowi. Token działa per
        Twoje konto i widzisz go tylko raz — zapisz go w bezpiecznym miejscu.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Nazwa (opcjonalnie), np. „agent na telefonie”"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
        />
        <Button onClick={generate} disabled={pending} className="shrink-0">
          {pending ? "Generuję…" : "Generuj token"}
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {fresh && (
        <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Skopiuj teraz — nie zobaczysz go ponownie:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 font-mono text-xs">
              {fresh}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={copy}
              aria-label="Kopiuj token"
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {tokens.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Nie masz jeszcze żadnych tokenów.
          </li>
        )}
        {tokens.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{t.name || "Bez nazwy"}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {t.prefix}…
                {t.last_used_at
                  ? ` · ostatnio użyty ${new Date(t.last_used_at).toLocaleDateString("pl-PL")}`
                  : " · nieużywany"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => revoke(t.id)}
              aria-label="Odwołaj token"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
