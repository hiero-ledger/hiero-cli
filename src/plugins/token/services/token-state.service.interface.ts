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
}
