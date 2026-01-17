/**
 * Output Service Interface
 * Handles command output formatting and rendering
 */
import type { OutputFormat } from '@/core/shared/types/output-format';
import type {
  HandleErrorOptions,
  HandleResultOptions,
  OutputHandlerOptions,
} from './types';

export interface OutputService {
  /**
   * Handle command output - parse, validate, format, and output
   * @deprecated Use handleResult instead
   */
  handleCommandOutput(options: OutputHandlerOptions): void;

  /**
   * Handle successful command result
   */
  handleResult(options: HandleResultOptions): void;

  /**
   * Handle error output
   */
  handleError(options: HandleErrorOptions): never;

  /**
   * Get the current output format
   */
  getFormat(): OutputFormat;

  /**
   * Set the current output format
   */
  setFormat(format: OutputFormat): void;
}
