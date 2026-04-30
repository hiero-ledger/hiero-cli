/**
 * Interface for Token-related operations
 * All token services must implement this interface
 */
import type {
  TokenAirdropTransaction,
  TokenAssociateTransaction,
  TokenBurnTransaction,
  TokenCancelAirdropTransaction,
  TokenClaimAirdropTransaction,
  TokenCreateTransaction,
  TokenDeleteTransaction,
  TokenDissociateTransaction,
  TokenFreezeTransaction,
  TokenGrantKycTransaction,
  TokenMintTransaction,
  TokenPauseTransaction,
  TokenRejectTransaction,
  TokenRevokeKycTransaction,
  TokenUnfreezeTransaction,
  TokenUnpauseTransaction,
  TokenUpdateNftsTransaction,
  TokenWipeTransaction,
} from '@hashgraph/sdk';
import type {
  TokenAirdropFtParams,
  TokenAirdropNftParams,
  TokenAssociationParams,
  TokenBurnFtParams,
  TokenBurnNftParams,
  TokenCancelAirdropParams,
  TokenClaimAirdropParams,
  TokenCreateParams,
  TokenDeleteParams,
  TokenDissociationParams,
  TokenFreezeParams,
  TokenGrantKycParams,
  TokenMintParams,
  TokenRejectAirdropParams,
  TokenRevokeKycParams,
  TokenUnfreezeParams,
  TokenUpdateNftMetadataParams,
  TokenWipeFtParams,
  TokenWipeNftParams,
} from '@/core/types/token.types';

export interface TokenService {
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
   * Create a token dissociation transaction (without execution)
   */
  createTokenDissociationTransaction(
    params: TokenDissociationParams,
  ): TokenDissociateTransaction;

  /**
   * Create a token mint transaction (without execution)
   * Supports both fungible tokens (with amount) and NFTs (with metadata)
   */
  createMintTransaction(params: TokenMintParams): TokenMintTransaction;

  createDeleteTransaction(params: TokenDeleteParams): TokenDeleteTransaction;

  createFreezeTransaction(params: TokenFreezeParams): TokenFreezeTransaction;

  createUnfreezeTransaction(
    params: TokenUnfreezeParams,
  ): TokenUnfreezeTransaction;

  createGrantKycTransaction(
    params: TokenGrantKycParams,
  ): TokenGrantKycTransaction;

  createRevokeKycTransaction(
    params: TokenRevokeKycParams,
  ): TokenRevokeKycTransaction;

  createPauseTransaction(params: { tokenId: string }): TokenPauseTransaction;

  createUnpauseTransaction(params: {
    tokenId: string;
  }): TokenUnpauseTransaction;

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

  createBurnFtTransaction(params: TokenBurnFtParams): TokenBurnTransaction;

  createBurnNftTransaction(params: TokenBurnNftParams): TokenBurnTransaction;

  createUpdateNftMetadataTransaction(
    params: TokenUpdateNftMetadataParams,
  ): TokenUpdateNftsTransaction;

  createWipeFtTransaction(params: TokenWipeFtParams): TokenWipeTransaction;

  createWipeNftTransaction(params: TokenWipeNftParams): TokenWipeTransaction;

  createRejectAirdropTransaction(
    params: TokenRejectAirdropParams,
  ): TokenRejectTransaction;
}
