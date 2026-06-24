// POST /api/stripe/webhook → źródło prawdy o zakupach (Stripe → nasz backend).
// Na publicznym URL Vercela działa bez Stripe CLI/tunelu. Weryfikuje podpis,
// a po `checkout.session.completed` (opłacone) zapisuje odblokowanie persony.
//
// WAŻNE: potrzebujemy SUROWEGO body do weryfikacji podpisu — czytamy req.text().

import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { recordTherapistUnlock } from "@/lib/therapist-access";
import { getPostHogServer } from "@/lib/posthog-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Brak STRIPE_WEBHOOK_SECRET.");
    return NextResponse.json({ error: "Webhook niedostępny." }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Brak podpisu." }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Zły podpis." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    if (
      session.payment_status === "paid" &&
      typeof meta.user_id === "string" &&
      typeof meta.therapist_id === "string"
    ) {
      try {
        await recordTherapistUnlock(meta.user_id, meta.therapist_id, session.id);
      } catch {
        // Zwróć 500, żeby Stripe ponowił dostarczenie.
        return NextResponse.json({ error: "Zapis nieudany." }, { status: 500 });
      }

      // Zdarzenie zakupu do PostHog (serwerowo — pewniejsze niż w przeglądarce).
      const ph = getPostHogServer();
      if (ph) {
        try {
          ph.capture({
            distinctId: meta.user_id,
            event: "therapist_purchased",
            properties: {
              therapist_id: meta.therapist_id,
              amount_total: session.amount_total,
              currency: session.currency,
            },
          });
          await ph.shutdown();
        } catch (err) {
          console.error("PostHog purchase capture:", err);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
