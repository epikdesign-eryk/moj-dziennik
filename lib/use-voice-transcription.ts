"use client";

// Hook dyktowania głosowego: nagrywa mikrofonem (WAV przez VoiceRecorder),
// wysyła do /api/transcribe (xAI STT na kredytach Groka) i przekazuje rozpoznany
// tekst do callbacka `onText`. Stan + licznik czasu służą do animacji przycisku.
// Logika wyciągnięta z dawnego `VoiceButton` w entry-editor.tsx, by można jej
// było użyć zarówno w toolbarze edytora, jak i w dolnym pasku kreatora wpisu.

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceRecorder } from "@/lib/voice-recorder";

export type VoiceState = "idle" | "recording" | "processing";

interface UseVoiceTranscriptionOptions {
  /** Wywoływane z rozpoznanym, niepustym tekstem po zakończeniu transkrypcji. */
  onText: (text: string) => void;
}

export function useVoiceTranscription({ onText }: UseVoiceTranscriptionOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Trzymamy aktualny callback w refie, by `transcribe` nie zależało od jego tożsamości.
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // Sprzątanie, gdy komponent zniknie w trakcie nagrywania.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stop().catch(() => {});
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  const transcribe = useCallback(async (blob: Blob) => {
    try {
      const form = new FormData();
      form.append("file", blob, "nagranie.wav");
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
        onTextRef.current(text);
      } else {
        setError("Nie rozpoznano mowy. Spróbuj jeszcze raz.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd transkrypcji.");
    } finally {
      setState("idle");
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Twoja przeglądarka nie wspiera nagrywania.");
      return;
    }
    try {
      const recorder = new VoiceRecorder();
      await recorder.start();
      recorderRef.current = recorder;

      setElapsed(0);
      setState("recording");
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      recorderRef.current = null;
      setError("Brak dostępu do mikrofonu.");
      setState("idle");
    }
  }, []);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    clearTimer();
    setState("processing");
    try {
      const blob = await recorder.stop();
      await transcribe(blob);
    } catch {
      setError("Nie udało się zakończyć nagrywania.");
      setState("idle");
    }
  }, [transcribe]);

  return { state, elapsed, error, start, stop };
}

/** Krótki licznik mm:ss dla trwającego nagrania. */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
