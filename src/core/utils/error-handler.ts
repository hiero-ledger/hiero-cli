/**
 * Centralized Error Handler
 * Handles all error formatting, output, and process termination
 */
import type { OutputService } from '@/core';

import { ZodError } from 'zod';

import { CliError, InternalError, ValidationError } from '@/core';
import { Status } from '@/core/shared/constants';

export function toCliError(error: unknown, message?: string): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof ZodError) {
    return ValidationError.fromZod(error);
  }

  if (error instanceof Error) {
    return new InternalError(message ?? error.message);
  }

  return new InternalError(message ?? 'Unexpected unsupported Error');
}

export function exitWithError(
  output: OutputService,
  message: string,
  error?: unknown,
) {
  const cliError = toCliError(error, message);

  return output.handleOutput({
    status: Status.Failure,
    template: cliError.getTemplate(),
    data: cliError.toJSON(),
  });
}

/**
 * Setup global error handlers for uncaught exceptions and signals
 * Should be called once at application startup
 */
export function setupGlobalErrorHandlers(output: OutputService): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    exitWithError(output, 'Uncaught exception', error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    exitWithError(output, 'Unhandled promise rejection', reason);
  });

  // Handle SIGINT (Ctrl+C) - user cancellation
  process.on('SIGINT', () => {
    exitWithError(output, 'Unhandled promise rejection');
  });

  // Handle SIGTERM - graceful shutdown requested by system
  process.on('SIGTERM', () => {
    exitWithError(output, 'Process terminated');
  });
}
