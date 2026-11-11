export interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface StreamChunk {
  error?: { message?: unknown };
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

    let parsed: StreamChunk | null;
    try {
      parsed = JSON.parse(payload) as StreamChunk | null;
    } catch {
      // Ignore provider-specific keepalive or malformed chunks.
      return false;
    }

    const errorMessage = parsed?.error?.message;
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      throw new Error(errorMessage);
    }

    const content = parsed?.choices?.[0]?.delta?.content;
    if (content) onContent(content);
    if (parsed?.usage) onUsage?.(parsed.usage);

    return false;
  };

  const processBuffer = (flush = false) => {
    const lines = buffer.split(/\r?\n/);
    buffer = flush ? '' : (lines.pop() ?? '');

    return lines.some(processLine);
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer) processLine(buffer);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      if (processBuffer()) {
        // DONE can arrive before the provider closes the connection.
        await reader.cancel().catch(() => undefined);
        return;
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
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
