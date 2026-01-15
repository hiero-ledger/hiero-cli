import { CliError } from './cli-error';
import { ErrorCode } from './error-code';

export class TransactionError extends CliError {
  constructor(
    message: string,
    options: {
      recoverable?: boolean;
      cause?: unknown;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super({
      code: ErrorCode.TRANSACTION_ERROR,
      message,
      recoverable: options.recoverable ?? false,
      ...options,
    });
  }
}
