// /docs → domyślnie dokumentacja API. Wspólny pasek boczny (layout) daje przejście do MCP.
import { redirect } from "next/navigation";

export default function DocsIndex() {
  redirect("/docs/api");
}
