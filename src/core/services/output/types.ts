/**
 * Output Handler Service Types
 */

export type OutputFormat = 'human' | 'json';

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
