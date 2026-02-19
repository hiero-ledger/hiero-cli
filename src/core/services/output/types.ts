/**
 * Output Handler Service Types
 */
import type { SerializedCliError } from '@/core';
import type { Status } from '@/core/shared/constants';
import type { OutputFormat } from '@/core/shared/types/output-format';

export interface ErrorOutput extends SerializedCliError {
  status: 'failure';
}

export interface OutputHandlerOptions {
  data: object;
  template?: string;
  status: Status;
}

// @deprecated @todo - Investigate usage of this
// export interface FormatOptions {
//   format: OutputFormat;
//   pretty?: boolean;
// }

// @deprecated @todo - If still present new error handling isn't production ready
export interface OutputOptions {
  outputJson: string;
  schema?: unknown;
  template?: string;
  format: OutputFormat;
  outputPath?: string;
}
