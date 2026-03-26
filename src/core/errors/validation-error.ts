import type { ZodError } from 'zod';

import { type $ZodIssue, toDotPath } from 'zod/v4/core';

import { CliError } from './cli-error';

export function formatZodIssueLine(issue: $ZodIssue): string {
  const path = issue.path.length === 0 ? '(root)' : toDotPath(issue.path);
  return `${path}: ${issue.message}`;
}

export function formatZodIssuesForMessage(zodError: ZodError): string {
  return zodError.issues.map((i) => `  - ${formatZodIssueLine(i)}`).join('\n');
}

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
