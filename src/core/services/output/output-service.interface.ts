/**
 * Output Service Interface
 * Handles command output formatting and rendering
 */
import type { OutputFormat } from '@/core/shared/types/output-format';
import type { OutputHandlerOptions } from './types';

export interface OutputService {
  /**
   * Handle a successful command result
   */
  handleOutput(options: OutputHandlerOptions): never;

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
