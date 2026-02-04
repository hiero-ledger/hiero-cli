import type { ZodError } from 'zod';

import { CliError } from '@/core';

export class ValidationError extends CliError {
  static readonly CODE = 'VALIDATION_ERROR';

  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super({
      code: ValidationError.CODE,
      recoverable: false,
      message,
      ...options,
    });
  }

  static fromZod(zodError: ZodError): ValidationError {
    const issues = zodError.issues.map((i) => i.message);
    const message = `Validation failed:\n${issues.map((i) => `  - ${i}`).join('\n')}`;

    return new ValidationError(message, {
      context: { issues },
      cause: zodError,
    });
  }
}
