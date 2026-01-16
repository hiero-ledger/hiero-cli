/**
 * Output Handler Service Types
 */
import type { SerializedCliError } from '@/core/errors';
import type { OutputFormat } from '@/core/shared/types/output-format';

export interface FormatOptions {
  format: OutputFormat;
  pretty?: boolean;
}

export interface ErrorOutput extends SerializedCliError {
  status: 'failure';
}

export interface OutputHandlerOptions {
  outputJson: string;
  schema?: unknown;
  template?: string;
  format: OutputFormat;
  outputPath?: string;
}

export interface HandleResultOptions {
  result: unknown;
  template?: string;
  format?: OutputFormat;
  outputPath?: string;
}

export interface HandleErrorOptions {
  error: unknown;
  format?: OutputFormat;
  outputPath?: string;
}
