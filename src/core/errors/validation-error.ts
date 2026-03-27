import type { ZodError } from 'zod';

import {
  formatZodIssueLine,
  formatZodIssuesForMessage,
} from '@/core/utils/format-zod-issues';

import { CliError } from './cli-error';

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
    const issueLines = zodError.issues.map((issue) =>
      formatZodIssueLine(issue),
    );
    const message = `Validation failed:\n${formatZodIssuesForMessage(zodError)}`;

    return new ValidationError(message, {
      context: { issues: issueLines },
      cause: zodError,
    });
  }
}
