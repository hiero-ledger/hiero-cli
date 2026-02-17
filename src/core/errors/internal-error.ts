import { CliError } from './cli-error';

export class InternalError extends CliError {
  static readonly CODE = 'INTERNAL_ERROR';

  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super({
      code: InternalError.CODE,
      recoverable: false,
      message,
      ...options,
    });
  }
}
