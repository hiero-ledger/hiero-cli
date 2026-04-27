import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface UpdateNftMetadataNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  serialNumbers: number[];
  metadataBytes: Uint8Array;
}

export interface UpdateNftMetadataBuildTransactionResult extends BaseBuildTransactionResult {}

export interface UpdateNftMetadataSignTransactionResult extends BaseSignTransactionResult {}

export interface UpdateNftMetadataExecuteTransactionResult {
  transactionResult: TransactionResult;
}
