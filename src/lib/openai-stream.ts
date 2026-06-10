export interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface StreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  usage?: ChatUsage;
}

interface ReadChatCompletionStreamOptions {
  response: Response;
  onContent: (content: string) => void;
  onUsage?: (usage: ChatUsage) => void;
}

export async function readChatCompletionStream({
  response,
  onContent,
  onUsage,
}: ReadChatCompletionStreamOptions) {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const payload = trimmed.replace(/^data:\s*/, '');
      if (payload === '[DONE]') return;

      try {
        const parsed = JSON.parse(payload) as StreamChunk;
        const content = parsed.choices?.[0]?.delta?.content;

        if (content) onContent(content);
        if (parsed.usage) onUsage?.(parsed.usage);
      } catch {
        // Ignore incomplete or provider-specific keepalive chunks.
      }
    }
  }
}

export async function readChatError(response: Response) {
  let message = `API Error: ${response.status} ${response.statusText}`.trim();

  try {
    const body = await response.json();
    const detail = body?.error?.message || body?.message;
    if (detail) message += `\n\n${detail}`;
  } catch {
    // Some compatible providers return empty or non-JSON error bodies.
  }

  return message;
}

