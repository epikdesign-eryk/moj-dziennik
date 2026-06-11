// Embedding tekstu w runtime (OpenAI text-embedding-3-small, 1536 wymiarów).
// Używane przez wyszukiwanie hybrydowe do zwektoryzowania zapytania użytkownika.
// Ten sam model i wymiary co offline'owy skrypt scripts/generate-embeddings.mjs,
// żeby wektory zapytania i wpisów leżały w tej samej przestrzeni.

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Zwraca embedding (1536 liczb) dla podanego tekstu.
 * Rzuca wyjątkiem przy braku klucza lub błędzie OpenAI — caller decyduje, jak reagować.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Brak OPENAI_API_KEY w środowisku.");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }

  const json = await res.json();
  return json.data[0].embedding as number[];
}
