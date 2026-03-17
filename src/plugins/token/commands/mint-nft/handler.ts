import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
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
import { HederaTokenType } from '@/core/shared/constants';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenMintNftInputSchema } from './input';

const MAX_METADATA_BYTES = 100;

export const TOKEN_MINT_NFT_COMMAND_NAME = 'token_mint-nft';

export class TokenMintNftCommand extends BaseTransactionCommand<
  TokenMintNftNormalizedParams,
  TokenMintNftBuildTransactionResult,
  TokenMintNftSignTransactionResult,
  TokenMintNftExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_MINT_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenMintNftNormalizedParams> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const validArgs = TokenMintNftInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>('default_key_manager');
    const network = api.network.getCurrentNetwork();
    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { tokenIdOrAlias: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
    logger.info(`Minting NFT for token: ${tokenId}`);

    const metadataBytes = new TextEncoder().encode(validArgs.metadata);
    if (metadataBytes.length > MAX_METADATA_BYTES) {
      throw new ValidationError('Metadata exceeds 100 bytes', {
        context: { tokenId, size: metadataBytes.length },
      });
    }

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);
    const tokenData = tokenState.getToken(tokenId);

    if (
      tokenData &&
      tokenData.tokenType !== HederaTokenType.NON_FUNGIBLE_TOKEN
    ) {
      throw new ValidationError('Token is not an NFT', {
        context: { tokenId },
      });
    }
    if (!tokenInfo.supply_key) {
      throw new ValidationError('Token has no supply key', {
        context: { tokenId },
      });
    }

    const supplyKeyResolved = await api.keyResolver.resolveSigningKey(
      validArgs.supplyKey,
      keyManager,
      ['token:supply'],
    );
    if (tokenInfo.supply_key.key !== supplyKeyResolved.publicKey) {
      throw new ValidationError('Supply key mismatch', {
        context: { tokenId },
      });
    }

    logger.info(`Using supply key: ${supplyKeyResolved.keyRefId}`);

    const maxSupply = BigInt(tokenInfo.max_supply || '0');
    const totalSupply = BigInt(tokenInfo.total_supply || '0');
    if (maxSupply > 0n) {
      const newTotalSupply = totalSupply + 1n;
      if (newTotalSupply > maxSupply) {
        throw new ValidationError('Mint would exceed max supply', {
          context: { tokenId, totalSupply, maxSupply },
        });
      }
      logger.info(
        `Token has finite supply. Current: ${totalSupply.toString()}, Max: ${maxSupply.toString()}, After mint: ${newTotalSupply.toString()}`,
      );
    }

    return {
      network,
      tokenId,
      metadataBytes,
      supplyKeyResolved,
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
    const { api, logger } = args;
    logger.debug(
      `Using key ${normalisedParams.supplyKeyResolved.keyRefId} for signing transaction`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.supplyKeyResolved.keyRefId],
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
  return new TokenMintNftCommand().execute(args);
}
