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
  TokenMintFtParams,
  TokenMintNftParams,
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
   * Create a fungible token mint transaction (without execution)
   */
  createMintFtTransaction(params: TokenMintFtParams): TokenMintTransaction;

  /**
   * Create an NFT mint transaction (without execution)
   */
  createMintNftTransaction(params: TokenMintNftParams): TokenMintTransaction;
}
