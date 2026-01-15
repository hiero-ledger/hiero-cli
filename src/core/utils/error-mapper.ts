import { ZodError } from 'zod';

import { CliError, ErrorCode, ValidationError } from '@/core/errors';

export function mapErrorToOutput(error: unknown) {
  if (error instanceof CliError) {
    return { status: 'failure', ...error.toJSON() };
  }

  if (error instanceof ZodError) {
    return { status: 'failure', ...ValidationError.fromZod(error).toJSON() };
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    status: 'failure',
    code: ErrorCode.INTERNAL_ERROR,
    message: errorMessage,
  };
}
