"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(translateError(error.message));
      setPending(false);
      return;
    }

    // Confirm email wyłączone → po rejestracji sesja powstaje od razu.
    router.push("/");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <Link
        href="/docs/api"
        className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Docs API
      </Link>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Mój Dziennik</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Zaloguj się, aby zobaczyć swoje wpisy."
                : "Załóż konto, aby zacząć pisać."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending
              ? "Chwila…"
              : mode === "login"
                ? "Zaloguj się"
                : "Zarejestruj się"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Nie masz konta? " : "Masz już konto? "}
          <button
            type="button"
            className="font-medium text-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "Zarejestruj się" : "Zaloguj się"}
          </button>
        </p>
      </div>
    </main>
  );
}

function translateError(message: string): string {
  if (/invalid login credentials/i.test(message))
    return "Nieprawidłowy e-mail lub hasło.";
  if (/user already registered/i.test(message))
    return "Konto z tym adresem e-mail już istnieje.";
  if (/password should be at least/i.test(message))
    return "Hasło musi mieć co najmniej 6 znaków.";
  return message;
}
