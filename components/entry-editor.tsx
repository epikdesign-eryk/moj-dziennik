"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntryEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
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

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
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

      <div className="ml-auto">
        <VoiceButton editor={editor} />
      </div>
    </div>
  );
}

/** Krótki licznik mm:ss dla trwającego nagrania. */
function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type VoiceState = "idle" | "recording" | "processing";

/**
 * Dyktowanie głosowe: nagrywa mikrofonem (MediaRecorder), wysyła do
 * /api/transcribe (xAI STT na kredytach Groka) i wstawia rozpoznany tekst do
 * edytora. W trakcie nagrywania pokazuje pulsującą animację i licznik czasu.
 */
function VoiceButton({ editor }: { editor: Editor }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sprzątanie, gdy komponent zniknie w trakcie nagrywania.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Twoja przeglądarka nie wspiera nagrywania.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stopStream();
        void transcribe(blob);
      };
      recorder.start();

      setElapsed(0);
      setState("recording");
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      stopStream();
      setError("Brak dostępu do mikrofonu.");
      setState("idle");
    }
  }

  function stopRecording() {
    // Przejdź do „przetwarzania" — reszta dzieje się w recorder.onstop.
    if (recorderRef.current?.state === "recording") {
      setState("processing");
      recorderRef.current.stop();
    }
  }

  async function transcribe(blob: Blob) {
    try {
      const form = new FormData();
      form.append("file", blob, "nagranie.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się przetworzyć nagrania.");
      }
      const text = (data.text ?? "").trim();
      if (text) {
        // Wstaw na pozycji kursora; dodaj spację, jeśli przylega do tekstu.
        const { from } = editor.state.selection;
        const before = from > 1 ? editor.state.doc.textBetween(from - 1, from) : "";
        const prefix = before && !/\s/.test(before) ? " " : "";
        editor.chain().focus().insertContent(prefix + text).run();
      } else {
        setError("Nie rozpoznano mowy. Spróbuj jeszcze raz.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd transkrypcji.");
    } finally {
      setState("idle");
    }
  }

  if (state === "recording") {
    return (
      <button
        type="button"
        onClick={stopRecording}
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
        onClick={startRecording}
        aria-label="Dyktuj głosowo"
        title="Dyktuj głosowo"
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Mic className="h-4 w-4" />
      </button>
    </div>
  );
}

export function EntryEditor({ value, onChange, placeholder }: EntryEditorProps) {
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

  return (
    <div className="rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
