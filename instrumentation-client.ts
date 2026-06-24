// Inicjalizacja PostHog po stronie klienta (konwencja Next 16: plik w roocie,
// odpala się po załadowaniu HTML, a przed hydracją React — idealne dla analityki).
//
// PRYWATNOŚĆ: to dziennik z bardzo wrażliwą treścią (wpisy, rozmowy z terapeutą),
// dlatego nagrania sesji maskują CAŁĄ treść tekstową i wszystkie pola formularzy.
// Widać przepływ, kliki i layout — nie widać, co ktoś napisał.

import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  try {
    posthog.init(key, {
      api_host: "/ingest", // reverse proxy (next.config.ts) → eu.i.posthog.com
      ui_host: "https://eu.posthog.com",
      defaults: "2025-05-24", // nowoczesne domyślne: pageview na zmianę historii (App Router)
      person_profiles: "identified_only", // profile tylko dla zalogowanych
      autocapture: true, // klik/inputy — zasila heatmapy
      enable_heatmaps: true, // heatmapy
      capture_exceptions: true, // śledzenie błędów JS (error tracking)
      session_recording: {
        maskAllInputs: true, // maskuj wszystkie pola formularzy
        maskTextSelector: "*", // maskuj CAŁĄ treść tekstową
      },
    });
  } catch (e) {
    // Analityka nigdy nie może wywrócić aplikacji.
    console.error("PostHog init error:", e);
  }
}
