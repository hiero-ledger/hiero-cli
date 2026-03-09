import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { MintNftOutput } from './output';
import type {
  MintNftBuildTransactionResult,
  MintNftExecuteTransactionResult,
  MintNftNormalizedParams,
  MintNftSignTransactionResult,
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

import { MintNftInputSchema } from './input';

const MAX_METADATA_BYTES = 100;

export class MintNftCommand extends BaseTransactionCommand<
  MintNftNormalizedParams,
  MintNftBuildTransactionResult,
  MintNftSignTransactionResult,
  MintNftExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<MintNftNormalizedParams> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const validArgs = MintNftInputSchema.parse(args.args);
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
    normalisedParams: MintNftNormalizedParams,
  ): Promise<MintNftBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createMintTransaction({
      tokenId: normalisedParams.tokenId,
      metadata: normalisedParams.metadataBytes,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: MintNftNormalizedParams,
    buildTransactionResult: MintNftBuildTransactionResult,
  ): Promise<MintNftSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(
      `Using key ${normalisedParams.supplyKeyResolved.keyRefId} for signing transaction`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.supplyKeyResolved.keyRefId],
    );
    return { transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: MintNftNormalizedParams,
    _buildTransactionResult: MintNftBuildTransactionResult,
    signTransactionResult: MintNftSignTransactionResult,
  ): Promise<MintNftExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.transaction,
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
    normalisedParams: MintNftNormalizedParams,
    _buildTransactionResult: MintNftBuildTransactionResult,
    _signTransactionResult: MintNftSignTransactionResult,
    executeTransactionResult: MintNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const serialNumber =
      executeTransactionResult.transactionResult.receipt.serials![0];
    const outputData: MintNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      serialNumber,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export const mintNft = (args: CommandHandlerArgs) =>
  new MintNftCommand().execute(args);
