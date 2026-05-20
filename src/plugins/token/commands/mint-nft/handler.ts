import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';
import type { TokenMintNftOutput } from './output';
import type {
  TokenMintNftBuildTransactionResult,
  TokenMintNftExecuteTransactionResult,
  TokenMintNftNormalizedParams,
  TokenMintNftSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { MAX_NFT_METADATA_BYTES } from '@/plugins/token/constants';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { TokenMintNftInputSchema } from './input';

export const TOKEN_MINT_NFT_COMMAND_NAME = 'token_mint-nft';

export class TokenMintNftCommand extends BaseTransactionCommand<
  TokenMintNftNormalizedParams,
  TokenMintNftBuildTransactionResult,
  TokenMintNftSignTransactionResult,
  TokenMintNftExecuteTransactionResult
> {
  constructor(
    private readonly tokenReferenceService: TokenReferenceService,
    private readonly tokenStateService: TokenStateService,
  ) {
    super(TOKEN_MINT_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenMintNftNormalizedParams> {
    const { api } = args;
    const validArgs = TokenMintNftInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const network = api.network.getCurrentNetwork();
    const resolvedToken = this.tokenReferenceService.resolveToken(
      validArgs.token,
      network,
    );

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { tokenIdOrAlias: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
    api.logger.info(`Minting NFT for token: ${tokenId}`);

    const metadataBytes = new TextEncoder().encode(validArgs.metadata);
    if (metadataBytes.length > MAX_NFT_METADATA_BYTES) {
      throw new ValidationError('Metadata exceeds 100 bytes', {
        context: { tokenId, size: metadataBytes.length },
      });
    }

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);
    const tokenData = this.tokenStateService.getToken(tokenId);

    const tokenInfoType = String(tokenInfo.type);
    if (
      tokenData?.tokenType === HederaTokenType.FUNGIBLE_COMMON ||
      (tokenInfoType !== 'NON_FUNGIBLE_UNIQUE' &&
        tokenInfoType !== 'NON_FUNGIBLE_TOKEN')
    ) {
      throw new ValidationError('Token is not an NFT', {
        context: { tokenId },
      });
    }
    const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.supply_key,
      explicitCredentials: validArgs.supplyKey,
      keyManager,
      signingKeyLabels: ['token:supply'],
      emptyMirrorRoleKeyMessage: 'Token has no supply key',
      insufficientKmsMatchesMessage:
        'Not enough supply key(s) found in key manager for this token. Provide --supply-key.',
      validationErrorOptions: { context: { tokenId } },
    });

    const maxSupply = BigInt(tokenInfo.max_supply || '0');
    const totalSupply = BigInt(tokenInfo.total_supply || '0');
    if (maxSupply > 0n) {
      const newTotalSupply = totalSupply + 1n;
      if (newTotalSupply > maxSupply) {
        throw new ValidationError('Mint would exceed max supply', {
          context: { tokenId, totalSupply, maxSupply },
        });
      }
      api.logger.info(
        `Token has finite supply. Current: ${totalSupply.toString()}, Max: ${maxSupply.toString()}, After mint: ${newTotalSupply.toString()}`,
      );
    }

    return {
      network,
      tokenId,
      metadataBytes,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenMintNftNormalizedParams,
  ): Promise<TokenMintNftBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createMintTransaction({
      tokenId: normalisedParams.tokenId,
      metadata: normalisedParams.metadataBytes,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenMintNftNormalizedParams,
    buildTransactionResult: TokenMintNftBuildTransactionResult,
  ): Promise<TokenMintNftSignTransactionResult> {
    const { api } = args;
    api.logger.debug(
      `Using ${normalisedParams.keyRefIds.length} key(s) for signing transaction`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );
    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenMintNftNormalizedParams,
    _buildTransactionResult: TokenMintNftBuildTransactionResult,
    signTransactionResult: TokenMintNftSignTransactionResult,
  ): Promise<TokenMintNftExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );
    if (!transactionResult.success) {
      throw new TransactionError(
        `NFT mint failed (tokenId: ${normalisedParams.tokenId}, txId: ${transactionResult.transactionId})`,
        false,
      );
    }
    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: TokenMintNftNormalizedParams,
    _buildTransactionResult: TokenMintNftBuildTransactionResult,
    _signTransactionResult: TokenMintNftSignTransactionResult,
    executeTransactionResult: TokenMintNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const serialNumber =
      executeTransactionResult.transactionResult.receipt.serials![0];
    const outputData: TokenMintNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      serialNumber,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenMintNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  return new TokenMintNftCommand(
    new TokenReferenceServiceImpl(api.identityResolution),
    new TokenStateServiceImpl(api.state, api.logger),
  ).execute(args);
}
