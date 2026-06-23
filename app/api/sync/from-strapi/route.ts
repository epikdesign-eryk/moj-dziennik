// Kierunek Strapi -> Supabase.
// Wyzwalany przez webhook Strapi (entry.create/update/delete/publish/unpublish).
// Zapisuje lustro w `entries` przez service-role i liczy embedding (RAG).
//
// Łącznik: Strapi Entry.supabaseId <-> entries.id
//          entries.strapi_id = Strapi documentId
//
// Pętla: jeśli wiersz Supabase ma identyczny hash treści — no-op.

import { createAdminClient } from "@/lib/supabase/admin";
import { updateEntry } from "@/lib/strapi";
import { entryHash } from "@/lib/sync-guard";
import { textToHtml } from "@/lib/journal-server";
import { embedText } from "@/lib/embeddings";
import { verifySyncSecret, userIdForEmail, toImagePaths } from "@/lib/sync-shared";

interface StrapiHookEntry {
  id: number;
  documentId: string;
  content?: string;
  mood?: number;
  images?: unknown; // JSON: ścieżki bucketa (kanon, dwukierunkowo)
  photos?: unknown; // Media Library (S3 -> Supabase): upload w panelu Strapi
  supabaseId?: string | null;
  userEmail?: string | null;
  entryDate?: string | null;
}

interface StrapiHookBody {
  event: string; // entry.create | entry.update | entry.delete | entry.publish | ...
  model: string;
  entry: StrapiHookEntry;
}

const SELECT = "id, content, mood, images, strapi_id";

export async function POST(req: Request) {
  if (!verifySyncSecret(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: StrapiHookBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  // Reagujemy tylko na model wpisu.
  if (body.model !== "entry" || !body.entry) {
    return Response.json({ ok: true, action: "ignored model" });
  }

  const admin = createAdminClient();
  const e = body.entry;

  try {
    // Znajdź istniejący wiersz: najpierw po supabaseId, w razie braku po strapi_id
    // (gdy link zwrotny jeszcze nie zdążył się zapisać — chroni przed duplikatem).
    async function findRow() {
      if (e.supabaseId) {
        const r = await admin.from("entries").select(SELECT).eq("id", e.supabaseId).maybeSingle();
        if (r.data) return r.data;
      }
      const r = await admin.from("entries").select(SELECT).eq("strapi_id", e.documentId).maybeSingle();
      return r.data;
    }

    // --- DELETE ---
    if (body.event === "entry.delete") {
      const row = await findRow();
      if (row) await admin.from("entries").delete().eq("id", row.id);
      return Response.json({ ok: true, action: "deleted" });
    }

    const plain = (e.content ?? "").trim();
    const mood = Number(e.mood ?? 3);
    // Scal kanoniczne ścieżki (images) z uploadami z Media Library (photos), bez duplikatów.
    const images = [...new Set([...toImagePaths(e.images), ...toImagePaths(e.photos)])];
    const incomingHash = entryHash({ content: plain, mood, images });

    const existing = await findRow();

    if (existing) {
      const existingHash = entryHash({
        content: existing.content ?? "",
        mood: existing.mood,
        images: existing.images ?? [],
      });
      if (existingHash === incomingHash) {
        return Response.json({ ok: true, action: "skip (in sync)" });
      }

      let embedding: number[] | undefined;
      try {
        if (plain) embedding = await embedText(plain);
      } catch (err) {
        console.error("from-strapi embedding:", err);
      }

      await admin
        .from("entries")
        .update({
          content: textToHtml(plain),
          mood,
          images,
          updated_at: new Date().toISOString(),
          strapi_id: e.documentId,
          ...(embedding ? { embedding } : {}),
        })
        .eq("id", existing.id);
      return Response.json({ ok: true, action: "updated supabase" });
    }

    // --- INSERT (wpis utworzony w panelu Strapi) ---
    const email = (e.userEmail ?? process.env.SYNC_DEFAULT_USER_EMAIL ?? "").trim();
    if (!email) {
      return Response.json({ error: "missing userEmail" }, { status: 422 });
    }
    const userId = await userIdForEmail(admin, email);
    if (!userId) {
      return Response.json({ error: `no user for ${email}` }, { status: 422 });
    }

    let embedding: number[] | undefined;
    try {
      if (plain) embedding = await embedText(plain);
    } catch (err) {
      console.error("from-strapi embedding:", err);
    }

    const { data: inserted, error } = await admin
      .from("entries")
      .insert({
        content: textToHtml(plain),
        mood,
        images,
        title: "",
        user_id: userId,
        strapi_id: e.documentId,
        created_at: e.entryDate || new Date().toISOString(),
        ...(embedding ? { embedding } : {}),
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("from-strapi insert:", error);
      return Response.json({ error: "insert failed" }, { status: 500 });
    }

    // Link zwrotny: zapisz supabaseId w Strapi (kolejny webhook będzie no-op).
    if (!e.supabaseId) {
      await updateEntry(e.documentId, { supabaseId: inserted.id });
    }
    return Response.json({ ok: true, action: "created supabase" });
  } catch (err) {
    console.error("from-strapi:", err);
    return Response.json({ error: "sync failed" }, { status: 500 });
  }
}
