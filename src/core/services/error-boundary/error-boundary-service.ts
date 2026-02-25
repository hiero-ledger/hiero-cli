import type { ErrorBoundaryService } from '@/core/services/error-boundary/error-boundary-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';

import { ZodError } from 'zod';

import { CliError, InternalError, ValidationError } from '@/core/errors';
import { Status } from '@/core/shared/constants';

interface HandleErrorOptions {
  message?: string;
}

type ProcessListener = (...args: unknown[]) => void;

export class ErrorBoundaryServiceImpl implements ErrorBoundaryService {
  private handlersRegistered = false;

  private readonly uncaughtExceptionListener: ProcessListener = (
    error: unknown,
  ) => {
    this.handle(error, { message: 'Uncaught exception' });
  };

  private readonly unhandledRejectionListener: ProcessListener = (
    reason: unknown,
  ) => {
    this.handle(reason, { message: 'Unhandled promise rejection' });
  };

  private readonly sigintListener: ProcessListener = () => {
    this.handle(new InternalError('Interrupted by user'));
  };

  private readonly sigtermListener: ProcessListener = () => {
    this.handle(new InternalError('Process terminated'));
  };

  constructor(
    private readonly output: OutputService,
    private readonly logger?: Logger,
  ) {}

  toCliError(error: unknown, message?: string): CliError {
    if (error instanceof CliError) {
      return error;
    }

    if (error instanceof ZodError) {
      return ValidationError.fromZod(error);
    }

    if (error instanceof Error) {
      return new InternalError(message ?? error.message, { cause: error });
    }

    return new InternalError(message ?? 'Unexpected unsupported Error', {
      context: { thrownType: typeof error },
    });
  }

  handle(error: unknown, options?: HandleErrorOptions): never {
    const cliError = this.toCliError(error, options?.message);

    try {
      return this.output.handleOutput({
        status: Status.Failure,
        template: cliError.getTemplate(),
        data: cliError.toJSON(),
      });
    } catch (outputError) {
      const outputFailureMessage =
        outputError instanceof Error
          ? outputError.message
          : String(outputError);

      this.logger?.error(
        `[ERROR-BOUNDARY] Failed to render error output: ${outputFailureMessage}`,
      );

      console.error(
        JSON.stringify({
          status: Status.Failure,
          ...cliError.toJSON(),
        }),
      );

      return process.exit(1);
    }
  }

  registerGlobalHandlers(): void {
    if (this.handlersRegistered) {
      return;
    }

    process.on('uncaughtException', this.uncaughtExceptionListener);
    process.on('unhandledRejection', this.unhandledRejectionListener);
    process.on('SIGINT', this.sigintListener);
    process.on('SIGTERM', this.sigtermListener);

    this.handlersRegistered = true;
  }

  dispose(): void {
    if (!this.handlersRegistered) {
      return;
    }

    process.removeListener('uncaughtException', this.uncaughtExceptionListener);
    process.removeListener(
      'unhandledRejection',
      this.unhandledRejectionListener,
    );
    process.removeListener('SIGINT', this.sigintListener);
    process.removeListener('SIGTERM', this.sigtermListener);

    this.handlersRegistered = false;
  }
}
