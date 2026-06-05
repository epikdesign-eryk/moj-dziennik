// Współdzielone elementy prezentacyjne dokumentacji (/docs/api, /docs/mcp).

import Link from "next/link";
import { TokenPanel } from "@/components/token-panel";

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

/** Panel tokenów dla zalogowanych, albo zaproszenie do logowania. */
export function TokenSection({ loggedIn }: { loggedIn: boolean }) {
  if (loggedIn) return <TokenPanel />;
  return (
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
  );
}
