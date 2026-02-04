import { CliError } from '@/core';

export class NotFoundError extends CliError {
  static readonly CODE = 'NOT_FOUND';

  constructor(
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: NotFoundError.CODE,
      message,
      recoverable: false,
      ...options,
    });
  }
}
