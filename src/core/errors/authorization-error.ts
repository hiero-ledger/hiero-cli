import { CliError } from '@/core';

export class AuthorizationError extends CliError {
  static readonly CODE = 'AUTHORIZATION_ERROR';

  constructor(
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: AuthorizationError.CODE,
      message,
      recoverable: false,
      ...options,
    });
  }
}
