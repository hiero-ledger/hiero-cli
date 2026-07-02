import { CliError } from './cli-error';

export class TransactionValidationError extends CliError {
  static readonly CODE = 'TRANSACTION_VALIDATION_ERROR';

  constructor(
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: TransactionValidationError.CODE,
      message,
      recoverable: false,
      ...options,
    });
  }
}
