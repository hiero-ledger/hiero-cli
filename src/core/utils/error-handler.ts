import type { OutputService } from '@/core/services/output/output-service.interface';

/**
 * Format error and exit process
 * Delegates to OutputService for consistent formatting
 */
export function formatAndExitWithError(
  context: string,
  error: unknown,
  outputService: OutputService,
): never {
  return outputService.handleError({ error });
}

/**
 * Setup global error handlers for uncaught exceptions and signals
 * NOTE: For PoC this is simplified as global handlers would need
 * an initialized OutputService which is not always available at startup.
 * @TODO POC_ERROR_HANDLING: Refactor to use OutputService once it's available
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('Unhandled promise rejection:', reason);
    process.exit(1);
  });
}
