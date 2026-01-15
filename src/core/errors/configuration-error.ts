import { CliError } from './cli-error';
import { ErrorCode } from './error-code';

export class ConfigurationError extends CliError {
  constructor(
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> },
  ) {
    super({
      code: ErrorCode.CONFIGURATION_ERROR,
      message,
      recoverable: false,
      ...options,
    });
  }
}
