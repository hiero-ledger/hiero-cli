/**
 * Output Service Interface
 * Handles command output formatting and rendering
 */
import type { OutputFormat } from '@/core/shared/types/output-format';
import type { OutputHandlerOptions, OutputOptions } from './types';

export interface OutputService {
  /**
   * Handle command output - parse, validate, format, and output
   * @deprecated @todo - If present the error handling isn't ready for production
   */
  handleCommandOutput(options: OutputOptions): void;

  /**
   * Handle a successful command result
   */
  handleOutput(options: OutputHandlerOptions): void;

  /**
   * Get the current output format
   */
  getFormat(): OutputFormat;

  /**
   * Set the current output format
   */
  setFormat(format: OutputFormat): void;

  /**
   * Write empty line for UI spacing
   */
  emptyLine(): void;
}
