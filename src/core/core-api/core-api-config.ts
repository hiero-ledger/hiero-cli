/**
 * Core API Configuration
 * Configuration options for initializing the Core API
 */
import { OutputFormat } from '../shared/types/output-format';

export interface CoreApiConfig {
  /**
   * Output format for the CLI
   */
  format: OutputFormat;
}
