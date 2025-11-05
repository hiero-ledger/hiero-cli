/**
 * Output Service Interface
 * Handles command output formatting and rendering
 */
import { OutputHandlerOptions } from './types';

export interface OutputService {
  /**
   * Handle command output - parse, validate, format, and output
   */
  handleCommandOutput(options: OutputHandlerOptions): void;

  /**
   * Get the current output format
   */
  getFormat(): 'human' | 'json';
}
