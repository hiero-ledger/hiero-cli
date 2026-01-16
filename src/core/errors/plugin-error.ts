import { CliError } from './cli-error';
import { ErrorCode } from './error-code';

export class PluginError extends CliError {
  constructor(
    message: string,
    options?: {
      cause?: unknown;
      context?: Record<string, unknown>;
      recoverable?: boolean;
    },
  ) {
    super({
      code: ErrorCode.PLUGIN_ERROR,
      message,
      recoverable: options?.recoverable ?? false,
      ...options,
    });
  }
}
