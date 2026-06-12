"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntryForm } from "@/components/entry-form";
import { ImageGrid } from "@/components/image-grid";
import { useEntries } from "@/lib/use-entries";
import { formatDateLong, moodEmoji, moodLabel } from "@/lib/journal-utils";
import type { JournalEntryDraft } from "@/types/journal";

export default function EntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { entries, loaded, updateEntry, removeEntry } = useEntries();
  const [editing, setEditing] = useState(false);

  const entry = entries.find((e) => e.id === params.id);

  if (!loaded) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <p className="text-muted-foreground">Wczytywanie…</p>
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <p className="mb-4 text-lg font-medium">Nie znaleziono wpisu.</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy
        </Link>
      </main>
    );
  }

  async function handleUpdate(draft: JournalEntryDraft) {
    await updateEntry(entry!.id, draft);
    setEditing(false);
  }

  async function handleDelete() {
    await removeEntry(entry!.id);
    router.push("/");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* Górny pasek: powrót po lewej, akcje (edycja/usuwanie) po prawej. */}
      <div className="mb-10 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/" />}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć
        </Button>

        {!editing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edytuj"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Usuń"
                    className="text-muted-foreground hover:text-destructive"
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Usunąć ten wpis?</DialogTitle>
                  <DialogDescription>
                    Tej operacji nie można cofnąć. Wpis zostanie trwale usunięty.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" onClick={handleDelete}>
                    Usuń wpis
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <h1 className="mb-8 text-3xl font-semibold">Edytuj wpis</h1>
          <EntryForm
            date={entry.date}
            initial={entry}
            submitLabel="Zapisz zmiany"
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        </>
      ) : (
        <article className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {formatDateLong(entry.date)}
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xl" aria-hidden>
              {moodEmoji(entry.mood)}
            </span>
            {moodLabel(entry.mood)}
          </p>

          <div
            className="entry-content mt-2 text-base"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(entry.content),
            }}
          />

          {entry.images.length > 0 && <ImageGrid paths={entry.images} />}
        </article>
      )}
    </main>
  );
}
