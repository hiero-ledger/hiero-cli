import type {
  FileCreateTransaction,
  FileDeleteTransaction,
  FileId,
  type Key,
} from '@hashgraph/sdk';

export interface FileCreateParams {
  bytecode: string;
  key: Key;
}

export interface FileCreateResult {
  transaction: FileCreateTransaction;
}

export interface FileDeleteParams {
  fileId: FileId;
}

export interface FileDeleteResult {
  transaction: FileDeleteTransaction;
}
