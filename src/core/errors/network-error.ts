import { CliError } from './cli-error';
import { ErrorCode } from './error-code';

export class NetworkError extends CliError {
  constructor(
    message: string,
    options: {
      recoverable?: boolean;
      cause?: unknown;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super({
      code: ErrorCode.NETWORK_ERROR,
      message,
      recoverable: options.recoverable ?? true,
      ...options,
    });
  }
}
