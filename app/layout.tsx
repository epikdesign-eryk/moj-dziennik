import type { Metadata } from "next";
import { Nunito_Sans, Lora } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
