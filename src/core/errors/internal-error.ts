import { CliError } from './cli-error';
import { ErrorCode } from './error-code';

export class InternalError extends CliError {
  constructor(
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> },
  ) {
    super({
      code: ErrorCode.INTERNAL_ERROR,
      message,
      recoverable: false,
      ...options,
    });
  }
}
