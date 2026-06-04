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

  async function handleSubmit(draft: JournalEntryDraft) {
    const entry = await createEntry(draft);
    router.push(`/entry/${entry.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy
      </Link>
      <EntryForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/")}
        submitLabel="Zapisz wpis"
        cancelLabel="Wróć do listy"
      />
    </main>
  );
}
