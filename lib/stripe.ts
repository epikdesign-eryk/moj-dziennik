// Klient Stripe — TYLKO serwerowo. Klucz STRIPE_SECRET_KEY nigdy nie trafia do klienta.
// Używany przez checkout (tworzenie sesji), weryfikację powrotu i webhook.

import Stripe from "stripe";

let cached: Stripe | null = null;

/** Zwraca singleton klienta Stripe. Rzuca, gdy brak klucza w środowisku. */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Brak STRIPE_SECRET_KEY w środowisku.");
  }
  cached = new Stripe(key);
  return cached;
}

/** Bazowy URL aplikacji do success/cancel URL. Vercel: NEXT_PUBLIC_SITE_URL. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
