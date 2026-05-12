import { CliError } from './cli-error';

export class StateError extends CliError {
  static readonly CODE = 'STATE_ERROR';

  constructor(
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: StateError.CODE,
      message,
      recoverable: false,
      ...options,
    });
  }
}
