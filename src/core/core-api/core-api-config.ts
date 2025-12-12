/**
 * Core API Configuration
 * Configuration options for initializing the Core API
 */
import type { OutputFormat } from '@/core/shared/types/output-format';

export interface CoreApiConfig {
  /**
   * Output format for the CLI
   */
  format: OutputFormat;
}
