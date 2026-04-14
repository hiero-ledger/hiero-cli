import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type {
  BurnNftBuildTransactionResult,
  BurnNftExecuteTransactionResult,
  BurnNftNormalizedParams,
  BurnNftSignTransactionResult,
} from '@/plugins/token/commands/burn-nft/types';
import type { TokenBurnNftOutput } from './output';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenBurnNftInputSchema } from './input';

export const TOKEN_BURN_NFT_COMMAND_NAME = 'token_burn-nft';

export class TokenBurnNftCommand extends BaseTransactionCommand<
  BurnNftNormalizedParams,
  BurnNftBuildTransactionResult,
  BurnNftSignTransactionResult,
  BurnNftExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_BURN_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<BurnNftNormalizedParams> {
    const { api, logger } = args;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);

    const validArgs = TokenBurnNftInputSchema.parse(args.args);

    const tokenIdOrAlias = validArgs.token;
    const keyManagerArg = validArgs.keyManager;

    const keyManager =
      keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${tokenIdOrAlias}`, {
        context: { tokenIdOrAlias },
      });
    }

    const tokenId = resolvedToken.tokenId;

    logger.info(`Burning NFT serials for token: ${tokenId}`);

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const tokenData = tokenState.getToken(tokenId);

    const isNftByState =
      tokenData !== null &&
      tokenData.tokenType === HederaTokenType.NON_FUNGIBLE_TOKEN;
    const isNftByMirror = tokenInfo.type === 'NON_FUNGIBLE_UNIQUE';

    if (!isNftByState && !isNftByMirror) {
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
      false,
      ['token:supply'],
    );

    const tokenSupplyKeyPublicKey = tokenInfo.supply_key.key;
    const providedSupplyKeyPublicKey = supplyKeyResolved.publicKey;

    if (tokenSupplyKeyPublicKey !== providedSupplyKeyPublicKey) {
      throw new ValidationError('Supply key mismatch', {
        context: { tokenId },
      });
    }

    logger.info(`Using supply key: ${supplyKeyResolved.keyRefId}`);

    const serialNumbers = validArgs.serials;
    const currentTotalSupply = BigInt(tokenInfo.total_supply || '0');

    logger.info(
      `Burning ${serialNumbers.length} NFT serial(s). Current supply: ${currentTotalSupply.toString()}, after burn: ${(currentTotalSupply - BigInt(serialNumbers.length)).toString()}`,
    );

    return {
      network,
      tokenId,
      serialNumbers,
      currentTotalSupply,
      supplyKeyResolved,
      keyRefIds: [supplyKeyResolved.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BurnNftNormalizedParams,
  ): Promise<BurnNftBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building NFT burn transaction body');
    const transaction = api.token.createBurnNftTransaction({
      tokenId: normalisedParams.tokenId,
      serialNumbers: normalisedParams.serialNumbers,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BurnNftNormalizedParams,
    buildTransactionResult: BurnNftBuildTransactionResult,
  ): Promise<BurnNftSignTransactionResult> {
    const { api, logger } = args;
    const supplyKeyRefId = normalisedParams.supplyKeyResolved.keyRefId;
    logger.debug(`Using key ${supplyKeyRefId} for signing transaction`);
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [supplyKeyRefId],
    );
    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BurnNftNormalizedParams,
    _buildTransactionResult: BurnNftBuildTransactionResult,
    signTransactionResult: BurnNftSignTransactionResult,
  ): Promise<BurnNftExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `NFT burn failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: BurnNftNormalizedParams,
    _buildTransactionResult: BurnNftBuildTransactionResult,
    _signTransactionResult: BurnNftSignTransactionResult,
    executeTransactionResult: BurnNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const newTotalSupply =
      normalisedParams.currentTotalSupply -
      BigInt(normalisedParams.serialNumbers.length);

    const outputData: TokenBurnNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      serialNumbers: normalisedParams.serialNumbers,
      newTotalSupply,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function tokenBurnNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenBurnNftCommand().execute(args);
}
