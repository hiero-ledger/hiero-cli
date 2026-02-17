import { CliError } from './cli-error';

export class NetworkError extends CliError {
  static readonly CODE = 'NETWORK_ERROR';

  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: unknown;
      recoverable?: boolean;
    },
  ) {
    super({
      code: NetworkError.CODE,
      message,
      recoverable: options?.recoverable ?? true,
      context: options?.context,
      cause: options?.cause,
    });
  }
}
