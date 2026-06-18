// GET /api/checkout/verify?session_id=... → weryfikacja płatności na powrocie ze Stripe.
// Pobiera sesję Checkout, sprawdza, że jest opłacona i należy do zalogowanego usera,
// po czym (idempotentnie) zapisuje odblokowanie. Daje natychmiastowy efekt w UI,
// niezależnie od webhooka (który jest źródłem prawdy).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getTherapist } from "@/lib/therapists";
import { recordTherapistUnlock } from "@/lib/therapist-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "Brak session_id." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  let paid = false;
  let therapistId = "";
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const meta = session.metadata ?? {};
    // Płatność musi być opłacona i należeć do TEGO użytkownika (nie ufamy URL-owi).
    if (
      session.payment_status === "paid" &&
      meta.user_id === user.id &&
      typeof meta.therapist_id === "string"
    ) {
      therapistId = meta.therapist_id;
      paid = true;
    }
  } catch (err) {
    console.error("Stripe verify error:", err);
    return NextResponse.json(
      { error: "Nie udało się zweryfikować płatności." },
      { status: 502 },
    );
  }

  const therapist = getTherapist(therapistId);
  if (!paid || !therapist) {
    return NextResponse.json({ unlocked: false });
  }

  try {
    await recordTherapistUnlock(user.id, therapist.id, sessionId);
  } catch {
    return NextResponse.json(
      { error: "Płatność OK, ale zapis odblokowania się nie powiódł." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    unlocked: true,
    therapist: { id: therapist.id, name: therapist.name },
  });
}
