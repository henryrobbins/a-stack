/**
 * Browser helpers for the FastAPI service, served same-origin under /api/py.
 * Every call carries the Clerk session token as a bearer token.
 */

export interface SSEFrame {
  event: string;
  data: Record<string, unknown>;
}

/** Decode a Server-Sent Events body into `{ event, data }` frames. */
export async function* parseSSE(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<SSEFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const lines = frame.split('\n');
      const event = lines.find((l) => l.startsWith('event: '))?.slice(7);
      const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
      if (event && data) {
        yield { event: event.trim(), data: JSON.parse(data) };
      }
    }
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function post(path: string, token: string | null, body: unknown) {
  const res = await fetch(`/api/py${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((j) => (typeof j.detail === 'string' ? j.detail : null))
      .catch(() => null);
    throw new ApiError(detail ?? `Request failed (${res.status})`, res.status);
  }
  return res;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Send a chat message and stream the reply. Resolves with usage when the
 * reply completes; rejects with the server's message if the stream fails.
 */
export async function streamChatMessage(
  chatId: string,
  message: { content: string; file_ids: string[] },
  token: string | null,
  onDelta: (text: string) => void
): Promise<Usage> {
  const res = await post(`/chats/${chatId}/messages`, token, message);
  for await (const frame of parseSSE(res.body!)) {
    if (frame.event === 'delta') {
      onDelta(String(frame.data.text));
    } else if (frame.event === 'done') {
      return frame.data as unknown as Usage;
    } else if (frame.event === 'error') {
      throw new ApiError(String(frame.data.message), 502);
    }
  }
  throw new ApiError('The reply ended unexpectedly', 502);
}

export interface StructuredResult extends Usage {
  id: string;
  output: unknown;
  duration_ms: number;
}

export async function runStructured(
  request: { prompt: string; schema: unknown; model: string },
  token: string | null
): Promise<StructuredResult> {
  const res = await post('/structured', token, request);
  return res.json();
}
