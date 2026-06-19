"use client";

// Ustawienia profilu — podgląd danych konta (e-mail) oraz edycja imienia.
// Imię trzymamy w user_metadata Supabase Auth, więc zapis to zwykły
// updateUser bez osobnej tabeli.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const user = data.user;
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? "");
      setName((user.user_metadata?.name as string) ?? "");
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { name: name.trim() },
    });

    setPending(false);
    if (error) {
      setError("Nie udało się zapisać zmian. Spróbuj ponownie.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  if (!loaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Wróć"
          onClick={() => router.push("/")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Ustawienia profilu</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Dane profilu
          </CardTitle>
          <CardDescription>
            Twoje imię. E-mail jest przypisany do konta i nie można go tu
            zmienić.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} disabled readOnly />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Imię</Label>
              <Input
                id="name"
                type="text"
                autoComplete="given-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="mt-2 flex items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? "Zapisywanie…" : "Zapisz zmiany"}
              </Button>
              {saved && (
                <span className="text-sm text-muted-foreground">
                  Zapisano ✓
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
