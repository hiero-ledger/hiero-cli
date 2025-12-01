export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function formatError(prefix: string, err: unknown): string {
  return `${prefix}: ${toErrorMessage(err)}`;
}
