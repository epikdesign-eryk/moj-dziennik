"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut, MoreVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

/**
 * Menu „więcej opcji" (trzy kropki pionowe). Na teraz zawiera tylko
 * wylogowanie, ale daje miejsce na kolejne akcje w przyszłości.
 */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Więcej opcji"
            disabled={pending}
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <Settings className="h-4 w-4" />
          Ustawienia profilu
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/docs/api")}>
          <BookOpen className="h-4 w-4" />
          Docs
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Wyloguj się
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
