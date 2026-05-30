"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EntryForm } from "@/components/entry-form";
import { useEntries } from "@/lib/use-entries";
import type { JournalEntryDraft } from "@/types/journal";

export default function NewEntryPage() {
  const router = useRouter();
  const { createEntry } = useEntries();

  function handleSubmit(draft: JournalEntryDraft) {
    const entry = createEntry(draft);
    router.push(`/entry/${entry.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy
      </Link>
      <h1 className="mb-3 text-3xl font-semibold">Nowy wpis</h1>
      <EntryForm onSubmit={handleSubmit} onCancel={() => router.push("/")} />
    </main>
  );
}
