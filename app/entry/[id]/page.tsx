"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  function handleUpdate(draft: JournalEntryDraft) {
    updateEntry(entry!.id, draft);
    setEditing(false);
  }

  function handleDelete() {
    removeEntry(entry!.id);
    router.push("/");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* Górny pasek: powrót po lewej, akcje (edycja/usuwanie) po prawej. */}
      <div className="mb-10 flex items-center justify-between lg:justify-end">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          wróć
        </Link>

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
          <h1 className="text-4xl font-semibold leading-tight">
            {entry.title || "(bez tytułu)"}
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xl" aria-hidden>
              {moodEmoji(entry.mood)}
            </span>
            {moodLabel(entry.mood)}
          </p>

          <div
            className="entry-content mt-4 text-base"
            dangerouslySetInnerHTML={{ __html: entry.content }}
          />
        </article>
      )}

      {/* Floating „Dodaj wpis" — tylko desktop i tylko w trybie podglądu,
          by móc utworzyć nowy wpis nie wracając na stronę główną. */}
      {!editing && (
        <div className="fixed inset-x-0 bottom-6 z-50 hidden justify-center lg:flex">
          <Link
            href="/new"
            aria-label="Dodaj wpis"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-14 rounded-full px-6 text-base shadow-lg transition-all",
            )}
          >
            <Plus className="h-5 w-5" />
            Dodaj wpis
          </Link>
        </div>
      )}
    </main>
  );
}
