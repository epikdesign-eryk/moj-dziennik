"use client";

// Wiąże tożsamość PostHog z zalogowanym użytkownikiem Supabase, żeby zdarzenia
// i nagrania były przypisane do konkretnego konta (analiza per użytkownik, lejki).
// Renderowany w layout — nic nie rysuje, tylko nasłuchuje zmian sesji.

import { useEffect } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

export function PostHogIdentify() {
  useEffect(() => {
    if (!posthog.__loaded) return;
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) {
        posthog.identify(data.user.id, { email: data.user.email });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        posthog.reset();
      } else if (session?.user) {
        posthog.identify(session.user.id, { email: session.user.email });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
