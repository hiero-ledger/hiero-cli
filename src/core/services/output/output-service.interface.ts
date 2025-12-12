/**
 * Output Service Interface
 * Handles command output formatting and rendering
 */
import type { OutputFormat } from '@/core/shared/types/output-format';
import type { OutputHandlerOptions } from './types';

export interface OutputService {
  /**
   * Handle command output - parse, validate, format, and output
   */
  handleCommandOutput(options: OutputHandlerOptions): void;

  /**
   * Get the current output format
   */
  getFormat(): OutputFormat;

  /**
   * Set the current output format
   */
  setFormat(format: OutputFormat): void;
}
