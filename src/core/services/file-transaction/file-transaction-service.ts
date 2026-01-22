import type { FileTransactionService } from '@/core/services/file-transaction/file-transaction-service.interface';
import type {
  FileCreateParams,
  FileCreateResult,
  FileDeleteParams,
  FileDeleteResult,
} from '@/core/services/file-transaction/types';

import { FileCreateTransaction, FileDeleteTransaction } from '@hashgraph/sdk';

export class FileTransactionServiceImpl implements FileTransactionService {
  createFileTransaction(params: FileCreateParams): FileCreateResult {
    // Create the file creation transaction
    const fileCreateTx = new FileCreateTransaction();

    if (params.bytecode) {
      fileCreateTx.setContents(params.bytecode);
    }

    if (params.key) {
      fileCreateTx.setKeys([params.key]);
    }

    return {
      transaction: fileCreateTx,
    };
  }

  deleteFileTransaction(params: FileDeleteParams): FileDeleteResult {
    // Create the file delete transaction
    const fileDeleteTx = new FileDeleteTransaction();

    if (params.fileId) {
      fileDeleteTx.setFileId(params.fileId);
    }

    return {
      transaction: fileDeleteTx,
    };
  }
}
