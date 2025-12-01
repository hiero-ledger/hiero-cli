import { ZodError } from 'zod';

function formatZodErrorMessages(err: ZodError): string {
  const messages = err.issues.map((issue) => issue.message);
  return '\n' + messages.map((msg) => `  - ${msg}`).join('\n');
}

export function toErrorMessage(err: unknown): string {
  // Check ZodError BEFORE instanceof Error
  if (err instanceof ZodError) {
    return formatZodErrorMessages(err);
  }

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
