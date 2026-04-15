/**
 * Interface for Token-related operations
 * All token services must implement this interface
 */
import type {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  TokenAirdropTransaction,
  TokenAssociateTransaction,
  TokenCancelAirdropTransaction,
  TokenClaimAirdropTransaction,
  TokenCreateTransaction,
  TokenDeleteTransaction,
  TokenMintTransaction,
  TransferTransaction,
} from '@hashgraph/sdk';
import type {
  NftAllowanceApproveParams,
  NftAllowanceDeleteParams,
  NftTransferParams,
  TokenAirdropFtParams,
  TokenAirdropNftParams,
  TokenAllowanceFtParams,
  TokenAssociationParams,
  TokenCancelAirdropParams,
  TokenClaimAirdropParams,
  TokenCreateParams,
  TokenDeleteParams,
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

  /**
   * Create an NFT transfer transaction (without execution)
   */
  createNftTransferTransaction(params: NftTransferParams): TransferTransaction;

  /**
   * Create an NFT allowance approve transaction (without execution)
   * Supports approving specific serial numbers or all serials in a collection
   */
  createNftAllowanceApproveTransaction(
    params: NftAllowanceApproveParams,
  ): AccountAllowanceApproveTransaction;

  createFungibleTokenAllowanceTransaction(
    params: TokenAllowanceFtParams,
  ): AccountAllowanceApproveTransaction;

  createNftAllowanceDeleteTransaction(
    params: NftAllowanceDeleteParams,
  ): AccountAllowanceApproveTransaction | AccountAllowanceDeleteTransaction;

  createDeleteTransaction(params: TokenDeleteParams): TokenDeleteTransaction;

  createAirdropFtTransaction(
    params: TokenAirdropFtParams,
  ): TokenAirdropTransaction;

  createAirdropNftTransaction(
    params: TokenAirdropNftParams,
  ): TokenAirdropTransaction;

  createClaimAirdropTransaction(
    params: TokenClaimAirdropParams,
  ): TokenClaimAirdropTransaction;

  createCancelAirdropTransaction(
    params: TokenCancelAirdropParams,
  ): TokenCancelAirdropTransaction;
}
