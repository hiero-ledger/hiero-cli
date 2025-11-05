/**
 * Core API Configuration
 * Configuration options for initializing the Core API
 */
import { OutputFormat } from '../services/output/types';

export interface CoreApiConfig {
  /**
   * Output format for the CLI
   */
  format: OutputFormat;
}
