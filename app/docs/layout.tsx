// Wspólny layout dokumentacji: sfiksowany pasek boczny + treść podstrony.
// Obejmuje /docs/api i /docs/mcp, dzięki czemu pasek jest spójny na obu.

import { DocsSidebar } from "@/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <div className="lg:flex lg:gap-10">
        <DocsSidebar />
        <main className="min-w-0 flex-1 py-8 pb-24 lg:max-w-2xl lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
