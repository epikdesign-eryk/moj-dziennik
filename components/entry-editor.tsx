"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import {
  useVoiceTranscription,
  formatElapsed,
} from "@/lib/use-voice-transcription";
import { cn } from "@/lib/utils";

interface EntryEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Tryb „goły": bez ramki i bez wewnętrznego toolbara (kreator ma własny). */
  bare?: boolean;
  /** Udostępnia instancję edytora rodzicowi (np. by wstawić tekst z dyktowania). */
  onReady?: (editor: Editor) => void;
}

/** Wstawia tekst na pozycji kursora, dodając spację gdy przylega do słowa. */
export function insertTextAtCursor(editor: Editor, text: string) {
  const { from } = editor.state.selection;
  const before = from > 1 ? editor.state.doc.textBetween(from - 1, from) : "";
  const prefix = before && !/\s/.test(before) ? " " : "";
  editor.chain().focus().insertContent(prefix + text).run();
}

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Pasek formatowania (B / I / listy). Domyślnie zawiera też przycisk dyktowania,
 * ale w kreatorze wpisu mikrofon żyje w dolnym pasku, więc można go ukryć
 * (`showVoice={false}`) i osadzić toolbar bez ramki.
 */
export function Toolbar({
  editor,
  showVoice = true,
  className,
}: {
  editor: Editor;
  showVoice?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        • Lista
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        1. Lista
      </ToolbarButton>

      {showVoice && (
        <div className="ml-auto">
          <VoiceButton editor={editor} />
        </div>
      )}
    </div>
  );
}

/**
 * Dyktowanie głosowe w toolbarze edytora: nagrywa mikrofonem, wysyła do
 * /api/transcribe i wstawia rozpoznany tekst na pozycji kursora. W trakcie
 * nagrywania pokazuje pulsującą animację i licznik czasu.
 */
function VoiceButton({ editor }: { editor: Editor }) {
  const { state, elapsed, error, start, stop } = useVoiceTranscription({
    onText: (text) => insertTextAtCursor(editor, text),
  });

  if (state === "recording") {
    return (
      <button
        type="button"
        onClick={stop}
        aria-label="Zatrzymaj nagrywanie"
        title="Zatrzymaj nagrywanie"
        className="flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
        <span className="tabular-nums">{formatElapsed(elapsed)}</span>
        <Square className="h-3.5 w-3.5 fill-current" />
      </button>
    );
  }

  if (state === "processing") {
    return (
      <button
        type="button"
        disabled
        aria-label="Przetwarzanie nagrania"
        className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Przetwarzam…
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={start}
        aria-label="Dyktuj głosowo"
        title="Dyktuj głosowo"
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Mic className="h-4 w-4" />
      </button>
    </div>
  );
}

export function EntryEditor({
  value,
  onChange,
  placeholder,
  bare = false,
  onReady,
}: EntryEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "min-h-[180px] px-3 py-2 focus:outline-none",
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Synchronizacja, gdy wartość zostanie ustawiona z zewnątrz (np. tryb edycji).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Przekaż instancję edytora rodzicowi (kreator wstawia do niej tekst z dyktowania).
  useEffect(() => {
    if (editor && onReady) onReady(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (bare) {
    return <EditorContent editor={editor} />;
  }

  return (
    <div className="rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring">
      {editor && (
        <Toolbar editor={editor} className="border-b border-border px-2 py-1.5" />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
