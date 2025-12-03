/**
 * Output Service Interface
 * Handles command output formatting and rendering
 */
import { OutputHandlerOptions } from './types';
import { OutputFormat } from '../../shared/types/output-format';

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
