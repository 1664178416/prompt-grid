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
  if (!reader) {
    throw new Error('API response did not include a readable stream.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data:')) return false;

    const payload = trimmed.replace(/^data:\s*/, '');
    if (payload === '[DONE]') return true;

    try {
      const parsed = JSON.parse(payload) as StreamChunk;
      const content = parsed.choices?.[0]?.delta?.content;

      if (content) onContent(content);
      if (parsed.usage) onUsage?.(parsed.usage);
    } catch {
      // Ignore provider-specific keepalive or malformed chunks.
    }

    return false;
  };

  const processBuffer = (flush = false) => {
    const lines = buffer.split(/\r?\n/);
    buffer = flush ? '' : (lines.pop() ?? '');

    return lines.some(processLine);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      if (buffer) processLine(buffer);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    if (processBuffer()) return;
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
