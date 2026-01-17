import type { OutputService } from '@/core/services/output/output-service.interface';

/**
 * Setup global error handlers for uncaught exceptions and signals
 * @param outputService - The output service to use for consistent error formatting
 * @TODO POC_ERROR_HANDLING: Ensure OutputService is correctly initialized
 */
export function setupGlobalErrorHandlers(outputService: OutputService): void {
  process.on('uncaughtException', (error: Error) => {
    outputService.handleError({ error });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    outputService.handleError({ error: reason });
  });
}
