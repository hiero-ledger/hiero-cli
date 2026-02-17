export interface CliErrorOptions {
  code: string;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
  recoverable: boolean;
}

export type SerializedCliError = Omit<CliErrorOptions, 'recoverable'>;

export abstract class CliError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;
  readonly recoverable: boolean;
  override readonly cause?: unknown;

  protected constructor(options: CliErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.cause = options.cause;
    this.context = options.context;
    this.recoverable = options.recoverable;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public getTemplate(): string {
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

  public toJSON(): SerializedCliError {
    const json: SerializedCliError = {
      code: this.code,
      message: this.message,
    };

    if (this.context) {
      json.context = this.context;
    }

    if (this.cause) {
      json.cause = this.formatCause();
    }

    return json;
  }
}
