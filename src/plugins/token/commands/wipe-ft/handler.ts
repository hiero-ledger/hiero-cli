import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenWipeFtOutput } from './output';
import type {
  WipeFtBuildTransactionResult,
  WipeFtExecuteTransactionResult,
  WipeFtNormalizedParams,
  WipeFtSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { HederaTokenType } from '@/core/shared/constants';
import { isRawUnits } from '@/core/utils/amount-helpers';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import {
  isCannotWipeTreasuryError,
  isNoWipeKeyError,
} from '@/plugins/token/utils/transaction-error-receipt-status';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenWipeFtInputSchema } from './input';

export const TOKEN_WIPE_FT_COMMAND_NAME = 'token_wipe-ft';

export class TokenWipeFtCommand extends BaseTransactionCommand<
  WipeFtNormalizedParams,
  WipeFtBuildTransactionResult,
  WipeFtSignTransactionResult,
  WipeFtExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_WIPE_FT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<WipeFtNormalizedParams> {
    const { api, logger } = args;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const validArgs = TokenWipeFtInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { token: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
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

    const { accountId } = await api.identityResolution.resolveAccount({
      accountReference: validArgs.account.value,
      type: validArgs.account.type,
      network,
    });

    const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.wipe_key,
      explicitCredentials: validArgs.wipeKey,
      keyManager,
      signingKeyLabels: ['token:wipe'],
      emptyMirrorRoleKeyMessage: 'Token has no wipe key',
      insufficientKmsMatchesMessage:
        'Not enough wipe key(s) found in key manager for this token. Provide --wipe-key.',
      validationErrorOptions: { context: { tokenId } },
    });

    const rawUnits = isRawUnits(validArgs.amount);
    const tokenDecimals = rawUnits ? 0 : parseInt(tokenInfo.decimals);
    const rawAmount = processTokenBalanceInput(validArgs.amount, tokenDecimals);

    if (rawAmount <= 0n) {
      throw new ValidationError('Amount must be greater than 0');
    }

    const currentTotalSupply = BigInt(tokenInfo.total_supply || '0');

    logger.info(
      `Wiping ${rawAmount.toString()} tokens from account ${accountId}. Current supply: ${currentTotalSupply.toString()}`,
    );

    return {
      network,
      tokenId,
      accountId,
      rawAmount,
      currentTotalSupply,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: WipeFtNormalizedParams,
  ): Promise<WipeFtBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building FT wipe transaction body');
    const transaction = api.token.createWipeFtTransaction({
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
      amount: normalisedParams.rawAmount,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: WipeFtNormalizedParams,
    buildTransactionResult: WipeFtBuildTransactionResult,
  ): Promise<WipeFtSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(
      `Using ${normalisedParams.keyRefIds.length} key(s) for signing transaction`,
    );
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: WipeFtNormalizedParams,
    _buildTransactionResult: WipeFtBuildTransactionResult,
    signTransactionResult: WipeFtSignTransactionResult,
  ): Promise<WipeFtExecuteTransactionResult> {
    const { api } = args;
    try {
      const result = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );

      if (!result.success) {
        throw new TransactionError(
          `FT wipe failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
          false,
        );
      }

      return { transactionResult: result };
    } catch (error) {
      if (isNoWipeKeyError(error)) {
        throw new ValidationError('Token has no wipe key', {
          context: { tokenId: normalisedParams.tokenId },
        });
      }
      if (isCannotWipeTreasuryError(error)) {
        throw new ValidationError('Cannot wipe tokens from treasury account', {
          context: { tokenId: normalisedParams.tokenId },
        });
      }
      throw error;
    }
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: WipeFtNormalizedParams,
    _buildTransactionResult: WipeFtBuildTransactionResult,
    _signTransactionResult: WipeFtSignTransactionResult,
    executeTransactionResult: WipeFtExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenWipeFtOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
      amount: normalisedParams.rawAmount,
      newTotalSupply:
        normalisedParams.currentTotalSupply - normalisedParams.rawAmount,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenWipeFt(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenWipeFtCommand().execute(args);
}
