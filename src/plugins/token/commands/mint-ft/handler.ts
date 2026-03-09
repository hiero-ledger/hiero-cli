import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type {
  MintFtBuildTransactionResult,
  MintFtExecuteTransactionResult,
  MintFtNormalizedParams,
  MintFtSignTransactionResult,
} from '@/plugins/token/commands/mint-ft/types';
import type { MintFtOutput } from './output';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { MintFtInputSchema } from './input';

export class MintFtCommand extends BaseTransactionCommand<
  MintFtNormalizedParams,
  MintFtBuildTransactionResult,
  MintFtSignTransactionResult,
  MintFtExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<MintFtNormalizedParams> {
    const { api, logger } = args;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);

    const validArgs = MintFtInputSchema.parse(args.args);

    const tokenIdOrAlias = validArgs.token;
    const userAmountInput = validArgs.amount;
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

    logger.info(`Minting tokens for token: ${tokenId}`);

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const tokenData = tokenState.getToken(tokenId);

    if (tokenData && tokenData.tokenType !== HederaTokenType.FUNGIBLE_COMMON) {
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

    const maxSupply = BigInt(tokenInfo.max_supply || '0');
    const totalSupply = BigInt(tokenInfo.total_supply || '0');

    if (maxSupply > 0n) {
      const newTotalSupply = totalSupply + rawAmount;
      if (newTotalSupply > maxSupply) {
        throw new ValidationError('Mint would exceed max supply', {
          context: { tokenId, rawAmount, totalSupply, maxSupply },
        });
      }
      logger.info(
        `Token has finite supply. Current: ${totalSupply.toString()}, Max: ${maxSupply.toString()}, After mint: ${newTotalSupply.toString()}`,
      );
    }
    return {
      network,
      tokenId,
      rawAmount,
      supplyKeyResolved,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: MintFtNormalizedParams,
  ): Promise<MintFtBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building mint transaction body');
    const transaction = api.token.createMintTransaction({
      tokenId: normalisedParams.tokenId,
      amount: normalisedParams.rawAmount,
    });
    return {
      transaction,
    };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: MintFtNormalizedParams,
    buildTransactionResult: MintFtBuildTransactionResult,
  ): Promise<MintFtSignTransactionResult> {
    const { api, logger } = args;
    const supplyKeyRefId = normalisedParams.supplyKeyResolved.keyRefId;
    logger.debug(`Using key ${supplyKeyRefId} for signing transaction`);
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [supplyKeyRefId],
    );
    return {
      transaction,
    };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: MintFtNormalizedParams,
    _buildTransactionResult: MintFtBuildTransactionResult,
    signTransactionResult: MintFtSignTransactionResult,
  ): Promise<MintFtExecuteTransactionResult> {
    const { api } = args;
    const signedTransaction = signTransactionResult.transaction;
    const result = await api.txExecute.execute(signedTransaction);

    if (!result.success) {
      throw new TransactionError(
        `Token mint failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
        false,
      );
    }
    return {
      transactionResult: result,
    };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: MintFtNormalizedParams,
    _buildTransactionResult: MintFtBuildTransactionResult,
    _signTransactionResult: MintFtSignTransactionResult,
    executeTransactionResult: MintFtExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: MintFtOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      amount: normalisedParams.rawAmount,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function mintFt(args: CommandHandlerArgs): Promise<CommandResult> {
  return new MintFtCommand().execute(args);
}
