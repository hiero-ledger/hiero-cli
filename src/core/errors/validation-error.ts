import type { ZodError } from 'zod';

import { CliError } from './cli-error';
import { ErrorCode } from './error-code';

export class ValidationError extends CliError {
  readonly issues?: string[];

  constructor(
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: ErrorCode.VALIDATION_ERROR,
      message,
      recoverable: false,
      ...options,
    });
  }

  static fromZod(zodError: ZodError): ValidationError {
    const issues = zodError.issues.map((i) => i.message);
    const error = new ValidationError(
      `Validation failed:\n${issues.map((i) => `  - ${i}`).join('\n')}`,
      { context: { issues }, cause: zodError },
    );
    (error as { issues: string[] }).issues = issues;
    return error;
  }
}
