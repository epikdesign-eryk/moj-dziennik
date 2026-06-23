// Kierunek Supabase -> Strapi.
// Wyzwalany przez Supabase Database Webhook na tabeli `entries` (INSERT/UPDATE/DELETE).
// Łapie WSZYSTKIE ścieżki zapisu w apce naraz (UI klienta, REST /api/entries, MCP),
// bo wpina się na poziomie bazy, a nie kodu aplikacji.
//
// Łącznik: entries.id  <->  Strapi Entry.supabaseId
//          entries.strapi_id (documentId)  <-  ustawiany po utworzeniu w Strapi
//
// Pętla: jeśli wpis po stronie Strapi ma identyczny hash treści — no-op.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  findEntryBySupabaseId,
  createEntry,
  updateEntry,
  deleteEntry,
} from "@/lib/strapi";
import { entryHash } from "@/lib/sync-guard";
import { stripHtml } from "@/lib/journal-server";
import { embedText } from "@/lib/embeddings";
import { verifySyncSecret, emailForUserId } from "@/lib/sync-shared";

interface EntryRecord {
  id: string;
  content: string | null;
  mood: number;
  images: string[] | null;
  created_at: string;
  user_id: string;
  strapi_id: string | null;
  embedding: unknown | null;
}

interface WebhookBody {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: EntryRecord | null;
  old_record: EntryRecord | null;
}

export async function POST(req: Request) {
  if (!verifySyncSecret(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // --- DELETE ---
    if (body.type === "DELETE") {
      const old = body.old_record;
      if (old?.id) {
        const existing = await findEntryBySupabaseId(old.id);
        if (existing) await deleteEntry(existing.documentId);
      }
      return Response.json({ ok: true, action: "deleted" });
    }

    const rec = body.record;
    if (!rec?.id) return Response.json({ ok: true, action: "noop" });

    const images = rec.images ?? [];
    const incomingHash = entryHash({
      content: rec.content ?? "",
      mood: rec.mood,
      images,
    });

    // Embedding: jeśli brak — policz i zapisz (automatyzacja, której wcześniej nie było).
    // Robimy to przed propagacją; kolejny webhook (po update embedding) będzie no-op.
    if (rec.embedding == null) {
      const text = stripHtml(rec.content ?? "");
      if (text) {
        try {
          const vector = await embedText(text);
          await admin.from("entries").update({ embedding: vector }).eq("id", rec.id);
        } catch (e) {
          console.error("from-supabase embedding:", e);
        }
      }
    }

    const email = await emailForUserId(admin, rec.user_id);
    if (!email) {
      return Response.json({ error: "user email not found" }, { status: 422 });
    }

    const data = {
      content: stripHtml(rec.content ?? ""),
      mood: rec.mood,
      images,
      supabaseId: rec.id,
      userEmail: email,
      entryDate: rec.created_at,
    };

    const existing = await findEntryBySupabaseId(rec.id);

    if (existing) {
      const existingHash = entryHash({
        content: existing.content,
        mood: existing.mood,
        images: existing.images,
      });
      if (existingHash === incomingHash) {
        return Response.json({ ok: true, action: "skip (in sync)" });
      }
      await updateEntry(existing.documentId, data);
      return Response.json({ ok: true, action: "updated strapi" });
    }

    const created = await createEntry(data);
    // Zapisz documentId po stronie Supabase (link zwrotny). Ten UPDATE wywoła
    // ponowny webhook, ale hash będzie zgodny -> no-op.
    if (!rec.strapi_id) {
      await admin
        .from("entries")
        .update({ strapi_id: created.documentId })
        .eq("id", rec.id);
    }
    return Response.json({ ok: true, action: "created strapi" });
  } catch (e) {
    console.error("from-supabase:", e);
    return Response.json({ error: "sync failed" }, { status: 500 });
  }
}
