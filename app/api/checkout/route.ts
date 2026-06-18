// POST /api/checkout { therapistId } → tworzy sesję Stripe Checkout i zwraca { url }.
// Cena tworzona inline (price_data) — nie wymaga zakładania produktów w Stripe z góry.
// W metadata zapisujemy user_id + therapist_id, by webhook/weryfikacja wiedziały, co odblokować.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";
import { getTherapist } from "@/lib/therapists";
import { isTherapistUnlocked } from "@/lib/therapist-access";

/**
 * Bazowy URL do success/cancel. Bierzemy go z bieżącego żądania (origin), więc
 * działa lokalnie i na Vercelu bez konfiguracji. Fallback: NEXT_PUBLIC_SITE_URL.
 */
function baseUrl(request: NextRequest): string {
  return request.nextUrl.origin || siteUrl();
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { therapistId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Zły JSON." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  const therapist = getTherapist(body.therapistId ?? "");
  if (!therapist || therapist.free) {
    return NextResponse.json(
      { error: "Nieznana lub darmowa persona." },
      { status: 400 },
    );
  }

  // Już kupiona → nie twórz kolejnej płatności.
  if (await isTherapistUnlocked(supabase, user.id, therapist.id)) {
    return NextResponse.json(
      { error: "Ta persona jest już odblokowana.", alreadyUnlocked: true },
      { status: 409 },
    );
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "pln",
            unit_amount: therapist.priceGrosze,
            product_data: {
              name: `Psychoterapeuta: ${therapist.name}`,
              description: therapist.blurb,
            },
          },
        },
      ],
      metadata: { user_id: user.id, therapist_id: therapist.id },
      success_url: `${baseUrl(request)}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl(request)}/?checkout=cancel`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe nie zwrócił adresu płatności." },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Nie udało się rozpocząć płatności. Spróbuj ponownie." },
      { status: 502 },
    );
  }
}
