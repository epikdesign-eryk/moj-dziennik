"use client";

// Ekran powrotu ze Stripe Checkout. Weryfikuje płatność na backendzie
// (/api/checkout/verify), odblokowuje + ustawia kupioną personę jako aktywną,
// po czym wraca na stronę główną. Webhook jest niezależnym źródłem prawdy.

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useActiveTherapist } from "@/lib/active-therapist";

type State =
  | { kind: "loading" }
  | { kind: "ok"; name: string }
  | { kind: "error"; message: string };

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { markUnlocked, refresh } = useActiveTherapist();
  const [state, setState] = useState<State>({ kind: "loading" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // jednorazowo (StrictMode/double-mount)
    ran.current = true;

    const sessionId = params.get("session_id");
    if (!sessionId) {
      setState({ kind: "error", message: "Brak identyfikatora płatności." });
      return;
    }

    fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then(
        (data: {
          unlocked?: boolean;
          therapist?: { id: string; name: string };
          error?: string;
        }) => {
          if (data.unlocked && data.therapist) {
            markUnlocked(data.therapist.id);
            refresh();
            setState({ kind: "ok", name: data.therapist.name });
            setTimeout(() => router.push("/"), 1800);
          } else {
            setState({
              kind: "error",
              message: data.error ?? "Nie potwierdzono płatności.",
            });
          }
        },
      )
      .catch(() =>
        setState({ kind: "error", message: "Nie udało się zweryfikować płatności." }),
      );
  }, [params, router, markUnlocked, refresh]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      {state.kind === "loading" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Potwierdzam płatność…</p>
        </>
      )}

      {state.kind === "ok" && (
        <>
          <CheckCircle2 className="h-10 w-10 text-primary" />
          <p className="text-lg font-semibold">Odblokowano: {state.name}</p>
          <p className="text-sm text-muted-foreground">
            Już ustawiamy go jako Twojego rozmówcę. Wracamy do dziennika…
          </p>
        </>
      )}

      {state.kind === "error" && (
        <>
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-lg font-semibold">Coś poszło nie tak</p>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Wróć do dziennika
          </button>
        </>
      )}
    </div>
  );
}
