import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type {
  BurnFtBuildTransactionResult,
  BurnFtExecuteTransactionResult,
  BurnFtNormalizedParams,
  BurnFtSignTransactionResult,
} from '@/plugins/token/commands/burn-ft/types';
import type { TokenBurnFtOutput } from './output';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { HederaTokenType } from '@/core/shared/constants';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenBurnFtInputSchema } from './input';

export const TOKEN_BURN_FT_COMMAND_NAME = 'token_burn-ft';

export class TokenBurnFtCommand extends BaseTransactionCommand<
  BurnFtNormalizedParams,
  BurnFtBuildTransactionResult,
  BurnFtSignTransactionResult,
  BurnFtExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_BURN_FT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<BurnFtNormalizedParams> {
    const { api, logger } = args;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);

    const validArgs = TokenBurnFtInputSchema.parse(args.args);

    const tokenIdOrAlias = validArgs.token;
    const userAmountInput = validArgs.amount;
    const keyManagerArg = validArgs.keyManager;

    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${tokenIdOrAlias}`, {
        context: { tokenIdOrAlias },
      });
    }

    const tokenId = resolvedToken.tokenId;

    logger.info(`Burning tokens for token: ${tokenId}`);

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const tokenData = tokenState.getToken(tokenId);

    const isNftByState =
      tokenData !== null &&
      tokenData.tokenType !== HederaTokenType.FUNGIBLE_COMMON;
    const isNftByMirror =
      tokenInfo.type === MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE;

    if (isNftByState || isNftByMirror) {
      throw new ValidationError('Token is not fungible', {
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

    const rawUnits = isRawUnits(userAmountInput);
    const tokenDecimals = rawUnits ? 0 : parseInt(tokenInfo.decimals);
    const rawAmount = processTokenBalanceInput(userAmountInput, tokenDecimals);

    if (rawAmount <= 0n) {
      throw new ValidationError('Amount must be greater than 0');
    }

    const currentTotalSupply = BigInt(tokenInfo.total_supply || '0');

    if (rawAmount > currentTotalSupply) {
      throw new ValidationError('Burn amount exceeds total supply', {
        context: { tokenId, rawAmount, currentTotalSupply },
      });
    }

    logger.info(
      `Burning ${rawAmount.toString()} tokens. Current supply: ${currentTotalSupply.toString()}, after burn: ${(currentTotalSupply - rawAmount).toString()}`,
    );

    return {
      network,
      tokenId,
      rawAmount,
      currentTotalSupply,
      supplyKeyResolved,
      keyRefIds: [supplyKeyResolved.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BurnFtNormalizedParams,
  ): Promise<BurnFtBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building burn transaction body');
    const transaction = api.token.createBurnFtTransaction({
      tokenId: normalisedParams.tokenId,
      amount: normalisedParams.rawAmount,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BurnFtNormalizedParams,
    buildTransactionResult: BurnFtBuildTransactionResult,
  ): Promise<BurnFtSignTransactionResult> {
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
    normalisedParams: BurnFtNormalizedParams,
    _buildTransactionResult: BurnFtBuildTransactionResult,
    signTransactionResult: BurnFtSignTransactionResult,
  ): Promise<BurnFtExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Token burn failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: BurnFtNormalizedParams,
    _buildTransactionResult: BurnFtBuildTransactionResult,
    _signTransactionResult: BurnFtSignTransactionResult,
    executeTransactionResult: BurnFtExecuteTransactionResult,
  ): Promise<CommandResult> {
    const newTotalSupply =
      normalisedParams.currentTotalSupply - normalisedParams.rawAmount;

    const outputData: TokenBurnFtOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      amount: normalisedParams.rawAmount,
      newTotalSupply,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function tokenBurnFt(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenBurnFtCommand().execute(args);
}
