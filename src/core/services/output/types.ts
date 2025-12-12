/**
 * Output Handler Service Types
 */
import type { OutputFormat } from '@/core/shared/types/output-format';

export interface FormatOptions {
  format: OutputFormat;
  pretty?: boolean;
}

export interface OutputHandlerOptions {
  outputJson: string;
  schema?: unknown;
  template?: string;
  format: OutputFormat;
  outputPath?: string;
}
