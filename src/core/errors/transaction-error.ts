import { CliError } from './cli-error';

export class TransactionError extends CliError {
  static readonly CODE = 'TRANSACTION_ERROR';

  constructor(
    message: string,
    recoverable: boolean,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: TransactionError.CODE,
      message,
      recoverable,
      ...options,
    });
  }
}
