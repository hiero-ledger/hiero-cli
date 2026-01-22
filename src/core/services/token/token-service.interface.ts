/**
 * Interface for Token-related operations
 * All token services must implement this interface
 */
import type {
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenMintTransaction,
  TransferTransaction,
} from '@hashgraph/sdk';
import type {
  TokenAssociationParams,
  TokenCreateParams,
  TokenMintParams,
  TokenTransferParams,
} from '@/core/types/token.types';

export interface TokenService {
  /**
   * Create a token transfer transaction (without execution)
   */
  createTransferTransaction(params: TokenTransferParams): TransferTransaction;

  /**
   * Create a token creation transaction (without execution)
   */
  createTokenTransaction(params: TokenCreateParams): TokenCreateTransaction;

  /**
   * Create a token association transaction (without execution)
   */
  createTokenAssociationTransaction(
    params: TokenAssociationParams,
  ): TokenAssociateTransaction;

  /**
   * Create a token mint transaction (without execution)
   * Supports both fungible tokens (with amount) and NFTs (with metadata)
   */
  createMintTransaction(params: TokenMintParams): TokenMintTransaction;
}
