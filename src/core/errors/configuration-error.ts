import { CliError } from './cli-error';

export class ConfigurationError extends CliError {
  static readonly CODE = 'CONFIGURATION_ERROR';

  constructor(
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: ConfigurationError.CODE,
      message,
      recoverable: false,
      ...options,
    });
  }
}
