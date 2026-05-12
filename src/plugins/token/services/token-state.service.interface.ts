import type { TokenData } from '@/plugins/token/schema';

export interface TokenStateStats {
  total: number;
  byNetwork: Record<string, number>;
  bySupplyType: Record<string, number>;
  withAssociations: number;
  totalAssociations: number;
  withKeys: number;
}

export interface TokenStateService {
  saveToken(key: string, tokenData: TokenData): void;
  getToken(key: string): TokenData | null;
  getAllTokens(): Record<string, TokenData>;
  removeToken(key: string): void;
  addTokenAssociation(
    key: string,
    accountId: string,
    accountName: string,
  ): void;
  removeTokenAssociation(key: string, accountId: string): void;
  listTokens(): TokenData[];
  getTokensWithStats(): TokenStateStats;
}
