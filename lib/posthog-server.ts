// Klient PostHog po stronie serwera (posthog-node) — do zdarzeń, których nie da
// się wiarygodnie złapać w przeglądarce, np. opłacony zakup persony (Stripe webhook).
// Używa tego samego Project API Key; host bez proxy (serwer woła PostHog wprost).

import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}
