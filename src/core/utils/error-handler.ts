/**
 * Centralized Error Handler
 * Handles all error formatting, output, and process termination
 */
import { Status } from '../shared/constants';
import { formatError } from './errors';
import {
  OutputFormat,
  DEFAULT_OUTPUT_FORMAT,
} from '../shared/types/output-format';
import { Logger } from '../services/logger/logger-service.interface';
import { ZodError } from 'zod';

// Global output format state for error handlers
let globalOutputFormat: OutputFormat = DEFAULT_OUTPUT_FORMAT;

/**
 * Set the global output format for error handlers
 */
export function setGlobalOutputFormat(format: OutputFormat): void {
  globalOutputFormat = format;
}

/**
 * Format error message for output
 */
function formatErrorOutput(
  errorMessage: string,
  format: OutputFormat,
  error?: unknown,
): string {
  if (format === 'json') {
    // Special handling for ZodError in JSON format
    if (error instanceof ZodError) {
      return JSON.stringify(
        {
          status: Status.Failure,
          errorMessage: errorMessage,
          errors: error.issues.map((issue) => issue.message),
        },
        null,
        2,
      );
    }

    // Default JSON format for other errors
    return JSON.stringify(
      {
        status: Status.Failure,
        errorMessage: errorMessage,
      },
      null,
      2,
    );
  }

  return `Error: ${errorMessage}`;
}

/**
 * Format error and exit process
 * Uses provided format or falls back to global format
 * Outputs to stdout for consistent error handling
 */
export function formatAndExitWithError(
  context: string,
  error: unknown,
  format?: OutputFormat,
): never {
  const errorMessage = formatError(context, error);
  const outputFormat = format ?? globalOutputFormat;
  const output = formatErrorOutput(errorMessage, outputFormat, error);

  console.log(output);
  process.exit(1);
}

/**
 * Handle termination signals (SIGINT, SIGTERM)
 * Formats output and exits with specified code
 */
function handleTerminationSignal(message: string, exitCode: number): void {
  const format = globalOutputFormat;

  if (format === 'json') {
    const output = JSON.stringify(
      {
        status: Status.Failure,
        errorMessage: message,
      },
      null,
      2,
    );
    console.log(output);
  } else {
    console.log(`\n${message}`);
  }
  process.exit(exitCode);
}

/**
 * Setup global error handlers for uncaught exceptions and signals
 * Should be called once at application startup
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    formatAndExitWithError('Uncaught exception', error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    formatAndExitWithError('Unhandled promise rejection', reason);
  });

  // Handle SIGINT (Ctrl+C) - user cancellation
  process.on('SIGINT', () => {
    handleTerminationSignal('Operation cancelled by user', 1);
  });

  // Handle SIGTERM - graceful shutdown requested by system
  process.on('SIGTERM', () => {
    handleTerminationSignal('Process terminated', 0);
  });
}
