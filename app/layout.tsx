import type { Metadata } from "next";
import { Nunito_Sans, Lora } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const sans = Nunito_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mój Dziennik",
  description: "Osobisty dziennik — zapisuj przemyślenia każdego dnia.",
};

// Ekran powitalny (intro) gra raz na sesję. Decyzję podejmujemy po stronie
// serwera na podstawie sesyjnego ciasteczka `mj-intro` — dzięki temu serwer i
// klient renderują to samo (brak mismatchu hydracji, bez anty-flash skryptu).
// Gdy intro było już widziane, oznaczamy <html data-intro="seen">, co przez CSS
// wyłącza overlay i animacje wejścia.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const introSeen = (await cookies()).has("mj-intro");

  return (
    <html
      lang="pl"
      data-intro={introSeen ? "seen" : undefined}
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell introSeen={introSeen}>{children}</AppShell>
      </body>
    </html>
  );
}
