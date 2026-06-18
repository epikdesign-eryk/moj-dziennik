// GET /api/therapists → katalog person + status odblokowania dla zalogowanego usera.
// Zasila picker wyboru i provider aktywnej persony po stronie klienta.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { THERAPISTS } from "@/lib/therapists";
import { listUnlockedTherapistIds } from "@/lib/therapist-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Brak sesji." }, { status: 401 });
  }

  const unlockedIds = await listUnlockedTherapistIds(supabase, user.id);
  const unlocked = new Set(unlockedIds);

  const therapists = THERAPISTS.map((t) => ({
    id: t.id,
    name: t.name,
    initials: t.initials,
    avatarBg: t.avatarBg,
    tagline: t.tagline,
    blurb: t.blurb,
    free: t.free,
    priceLabel: t.priceLabel,
    unlocked: t.free || unlocked.has(t.id),
  }));

  return NextResponse.json({ therapists });
}
