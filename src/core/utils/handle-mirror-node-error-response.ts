import { NetworkError, NotFoundError } from '@/core/errors';

export async function handleMirrorNodeErrorResponse(
  response: Response,
  failureMessagePrefix: string,
  throwOn404: boolean,
  messageNotFound?: string,
): Promise<void> {
  if (response.status === 404) {
    if (throwOn404) {
      throw new NotFoundError(messageNotFound ?? 'Entity not found');
    }
    return;
  }

  if (response.status === 400) {
    const apiMessages = await parseMirrorNodeErrorMessages(response);
    throw new NetworkError(
      `${failureMessagePrefix}: ${response.status} ${response.statusText}`,
      {
        context: { apiMessages },
        recoverable: false,
      },
    );
  }

  throw new NetworkError(
    `${failureMessagePrefix}: ${response.status} ${response.statusText}`,
    { recoverable: true },
  );
}

async function parseMirrorNodeErrorMessages(
  response: Response,
): Promise<string[]> {
  try {
    const data = (await response.json()) as {
      _status?: { messages?: Array<{ message?: string }> };
    };
    const messages = data._status?.messages;
    if (Array.isArray(messages)) {
      return messages
        .map((m) => m.message)
        .filter((msg): msg is string => typeof msg === 'string');
    }
  } catch {
    // Ignore parse errors, return empty array
  }
  return [];
}
