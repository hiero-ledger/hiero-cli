import { CliError } from '@/core';

export class FileError extends CliError {
  static readonly CODE = 'FILE_ERROR';

  constructor(
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: FileError.CODE,
      message,
      recoverable: false,
      ...options,
    });
  }
}
