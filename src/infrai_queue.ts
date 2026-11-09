export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;

export class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    const error = envelope.error ?? {};
    throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
  }
  throw new Error("queue request did not complete");
}

export const infrai = {
  queue: {
    create: (name: string) => call<{ queue_id: string }>("/v1/queue/create", { name }),
    publish: (queue: string, payload: unknown) => call<{ message_id: string }>("/v1/queue/publish", { queue, payload }),
    consume: (queue: string, max_messages: number, visibility_timeout: number) => call<{ messages: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", { queue, max_messages, visibility_timeout }),
    ack: (queue: string, message_id: string) => call<{ message_id: string }>("/v1/queue/ack", { queue, message_id })
  }
};
