export async function parseMirrorNodeErrorMessages(
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
