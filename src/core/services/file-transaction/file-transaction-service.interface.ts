import type {
  FileCreateParams,
  FileCreateResult,
  FileDeleteParams,
  FileDeleteResult,
} from '@/core/services/file-transaction/types';

export interface FileTransactionService {
  createFileTransaction(params: FileCreateParams): FileCreateResult;
  deleteFileTransaction(params: FileDeleteParams): FileDeleteResult;
}
