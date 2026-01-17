import { CliError } from './cli-error';
import { ErrorCode } from './error-code';

export class NotFoundError extends CliError {
  constructor(
    entityType: string,
    identifier: string,
    options?: { cause?: unknown },
  ) {
    super({
      code: ErrorCode.NOT_FOUND,
      message: `${entityType} not found: ${identifier}`,
      recoverable: false,
      context: { entityType, identifier },
      ...options,
    });
  }
}
