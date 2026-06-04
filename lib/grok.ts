// Cienki klient API xAI (Grok). Endpoint jest zgodny z OpenAI, więc wołamy go
// zwykłym `fetch` — bez dodatkowej zależności SDK. Używany WYŁĄCZNIE po stronie
// serwera (route handler); klucz `XAI_API_KEY` nigdy nie trafia do klienta.
//
// ⚠️ Dokładne ID modelu / parametry Grok 4.1 Fast należy zweryfikować w
// dokumentacji xAI. Domyślne wartości można nadpisać zmiennymi środowiskowymi.

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = process.env.XAI_MODEL ?? "grok-4-1-fast-non-reasoning";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  /** Tylko dla wiadomości asystenta, które wywołują narzędzia. */
  tool_calls?: ToolCall[];
  /** Tylko dla wiadomości roli `tool` — id wywołania, na które odpowiadamy. */
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface GrokResponse {
  choices: { message: ChatMessage; finish_reason: string }[];
}

/** Jedno wywołanie chat-completions. Zwraca wiadomość asystenta. */
export async function grokChat(opts: {
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
  signal?: AbortSignal;
}): Promise<ChatMessage> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("Brak XAI_API_KEY w środowisku.");
  }

  const res = await fetch(XAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: opts.tools ? "auto" : undefined,
      temperature: opts.temperature ?? 0.7,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Grok API ${res.status}: ${detail.slice(0, 500)}`);
  }

  const data = (await res.json()) as GrokResponse;
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error("Grok: pusta odpowiedź.");
  return message;
}
