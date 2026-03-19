export function getCauseMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'object' && cause !== null) return JSON.stringify(cause);
  return String(cause);
}
