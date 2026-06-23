// Wspólne narzędzia dla endpointów synchronizacji Supabase <-> Strapi.

import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Sprawdza sekret webhooka (nagłówek `x-sync-secret`) w sposób odporny na timing. */
export function verifySyncSecret(req: Request): boolean {
  const expected = process.env.SYNC_SHARED_SECRET;
  if (!expected) return false;
  const got = req.headers.get("x-sync-secret") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** user_id -> email logowania (Supabase Auth, service-role). */
export async function emailForUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return data.user.email ?? null;
}

/** email logowania -> user_id (Supabase Auth, service-role). Apka ma garść kont. */
export async function userIdForEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  // Stronicowanie na wypadek wielu kont; w praktyce kont jest niewiele.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Normalizuje pole `images` z webhooka Strapi do listy ścieżek bucketa.
 * Akceptuje tablicę stringów (ścieżki) albo tablicę obiektów media ({url|path}).
 */
export function toImagePaths(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const out: string[] = [];
  for (const item of images) {
    if (typeof item === "string") {
      out.push(stripBucketPrefix(item));
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const raw = (obj.path ?? obj.url ?? "") as string;
      if (raw) out.push(stripBucketPrefix(raw));
    }
  }
  return out.filter(Boolean);
}

/** Z pełnego URL-a Storage wyłuskuje ścieżkę obiektu w buckecie `entry-images`. */
function stripBucketPrefix(raw: string): string {
  const marker = "/entry-images/";
  const idx = raw.indexOf(marker);
  if (idx !== -1) return raw.slice(idx + marker.length).split("?")[0];
  return raw; // już jest ścieżką
}
