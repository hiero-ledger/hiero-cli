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
function formatErrorOutput(errorMessage: string, format: OutputFormat): string {
  if (format === 'json') {
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
  logger: Logger,
  format?: OutputFormat,
): never {
  const errorMessage = formatError(context, error);
  const outputFormat = format ?? globalOutputFormat;
  const output = formatErrorOutput(errorMessage, outputFormat);

  logger.error(output);
  process.exit(1);
}

/**
 * Handle termination signals (SIGINT, SIGTERM)
 * Formats output and exits with specified code
 */
function handleTerminationSignal(
  message: string,
  exitCode: number,
  logger: Logger,
): void {
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
    logger.error(output);
  } else {
    logger.error(`\n${message}`);
  }
  process.exit(exitCode);
}

/**
 * Setup global error handlers for uncaught exceptions and signals
 * Should be called once at application startup
 */
export function setupGlobalErrorHandlers(logger: Logger): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    formatAndExitWithError('Uncaught exception', error, logger);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    formatAndExitWithError('Unhandled promise rejection', reason, logger);
  });

  // Handle SIGINT (Ctrl+C) - user cancellation
  process.on('SIGINT', () => {
    handleTerminationSignal('Operation cancelled by user', 1, logger);
  });

  // Handle SIGTERM - graceful shutdown requested by system
  process.on('SIGTERM', () => {
    handleTerminationSignal('Process terminated', 0, logger);
  });
}
