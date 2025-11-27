/**
 * Token Transaction Type Definitions
 * Type definitions for token-related operations
 */

/**
 * Parameters for token transfer transactions
 */
export interface TokenTransferParams {
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: bigint;
}

/**
 * Custom fee configuration for tokens
 */
export interface CustomFee {
  type: 'fixed'; // Only fixed fees supported
  amount: number; // Required for fixed fees
  unitType?: 'HBAR'; // Only HBAR supported, defaults to HBAR
  collectorId?: string;
  exempt?: boolean;
}

/**
 * Parameters for token creation transactions
 */
export interface TokenCreateParams {
  name: string;
  symbol: string;
  treasuryId: string;
  decimals: number;
  initialSupplyRaw: bigint;
  supplyType: 'FINITE' | 'INFINITE';
  maxSupplyRaw?: bigint; // Required for FINITE supply type
  adminKey: string;
  customFees?: CustomFee[];
  memo?: string;
}

/**
 * Parameters for token association transactions
 */
export interface TokenAssociationParams {
  tokenId: string;
  accountId: string;
}
