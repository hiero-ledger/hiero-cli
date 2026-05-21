import type { BatchDataItem } from '@/core/types/shared.types';
import type { TokenData } from '@/plugins/token/schema';

export interface TokenStateStats {
  total: number;
  byNetwork: Record<string, number>;
  bySupplyType: Record<string, number>;
  withKeys: number;
}

export interface TokenStateService {
  saveToken(key: string, tokenData: TokenData): void;
  getToken(key: string): TokenData | null;
  getAllTokens(): Record<string, TokenData>;
  removeToken(key: string): void;
  listTokens(): TokenData[];
  getTokensWithStats(): TokenStateStats;

  applyAssociationFromBatchItem(item: BatchDataItem): Promise<void>;
  applyDissociationFromBatchItem(item: BatchDataItem): Promise<void>;
  applyCreateFtFromBatchItem(item: BatchDataItem): Promise<void>;
  applyCreateNftFromBatchItem(item: BatchDataItem): Promise<void>;
  applyUpdateFromBatchItem(item: BatchDataItem): Promise<void>;
  applyDeleteFromBatchItem(item: BatchDataItem): Promise<void>;
  applyCreateFtFromFileFromBatchItem(item: BatchDataItem): Promise<void>;
  applyCreateNftFromFileFromBatchItem(item: BatchDataItem): Promise<void>;
}
