import type { ErrorCode } from './error-code';

export interface CliErrorOptions {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
  recoverable: boolean;
}

/**
 * Interface for serialized error data
 * Ensures type safety for CLI output
 */
export interface SerializedCliError {
  code: ErrorCode;
  message: string;
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class CliError extends Error {
  readonly code: ErrorCode;
  readonly context?: Record<string, unknown>;
  readonly recoverable: boolean;
  override readonly cause?: unknown;

  constructor(options: CliErrorOptions) {
    super(options.message);
    this.name = 'CliError';
    this.code = options.code;
    this.cause = options.cause;
    this.context = options.context;
    this.recoverable = options.recoverable;

    // Ensure stack trace is captured correctly
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  getTemplate(): string {
    return '{{message}}';
  }

  protected formatCause(): unknown {
    if (this.cause instanceof Error) {
      return {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      };
    }
    return this.cause;
  }

  toJSON(): SerializedCliError {
    return {
      code: this.code,
      message: this.message,
      ...(this.context ? { context: this.context } : {}),
      ...(this.cause ? { cause: this.formatCause() } : {}),
    };
  }
}
