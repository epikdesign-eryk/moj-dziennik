"use client";

// Cienki, bezpieczny wrapper na PostHog do własnych zdarzeń. No-op, gdy PostHog
// nie został zainicjalizowany (np. brak klucza w dev) — analityka nie wywraca apki.

import posthog from "posthog-js";

export function track(event: string, properties?: Record<string, unknown>): void {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture(event, properties);
    }
  } catch {
    /* celowo zignorowane — zdarzenie analityczne nie może rzucać */
  }
}
