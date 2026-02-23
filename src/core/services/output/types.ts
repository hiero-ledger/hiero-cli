/**
 * Output Handler Service Types
 */
import type { SerializedCliError } from '@/core';
import type { Status } from '@/core/shared/constants';

export interface ErrorOutput extends SerializedCliError {
  status: 'failure';
}

export interface OutputHandlerOptions {
  data: object;
  template?: string;
  status: Status;
}
