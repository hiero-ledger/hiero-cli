import type { CliError } from '@/core/errors';

interface HandleErrorOptions {
  message?: string;
}

export interface ErrorBoundaryService {
  toCliError(error: unknown, message?: string): CliError;
  handle(error: unknown, options?: HandleErrorOptions): never;
  registerGlobalHandlers(): void;
  dispose(): void;
}
