import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenAllowanceFtOutput } from './output';
import type {
  TokenAllowanceFtBuildTransactionResult,
  TokenAllowanceFtExecuteTransactionResult,
  TokenAllowanceFtNormalizedParams,
  TokenAllowanceFtSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { FtAllowanceEntry } from '@/core/services/allowance';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenAllowanceFtInputSchema } from './input';

export const TOKEN_ALLOWANCE_FT_COMMAND_NAME = 'token_allowance-ft';

export class TokenAllowanceFtCommand extends BaseTransactionCommand<
  TokenAllowanceFtNormalizedParams,
  TokenAllowanceFtBuildTransactionResult,
  TokenAllowanceFtSignTransactionResult,
  TokenAllowanceFtExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_ALLOWANCE_FT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenAllowanceFtNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenAllowanceFtInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>('default_key_manager');

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    let tokenDecimals = 0;
    if (!isRawUnits(validArgs.amount)) {
      const tokenInfoStorage = tokenState.getToken(tokenId);
      if (tokenInfoStorage) {
        tokenDecimals = tokenInfoStorage.decimals;
      } else {
        const tokenInfoMirror = await api.mirror.getTokenInfo(tokenId);
        tokenDecimals = parseInt(tokenInfoMirror.decimals) || 0;
      }
    }

    const rawAmount = processTokenBalanceInput(validArgs.amount, tokenDecimals);

    const resolvedOwner = await api.keyResolver.resolveAccountCredentials(
      validArgs.owner,
      keyManager,
      true,
      ['token:owner'],
    );

    const resolvedSpender = resolveDestinationAccountParameter(
      validArgs.spender,
      api,
      network,
    );
    if (!resolvedSpender) {
      throw new NotFoundError(
        `Spender account not found: ${validArgs.spender}`,
        {
          context: { spender: validArgs.spender },
        },
      );
    }

    logger.info(
      `Approving ${rawAmount.toString()} tokens of ${tokenId} for spender ${resolvedSpender.accountId}`,
    );

    return {
      network,
      tokenId,
      ownerAccountId: resolvedOwner.accountId,
      spenderAccountId: resolvedSpender.accountId,
      rawAmount,
      signerKeyRefId: resolvedOwner.keyRefId,
      keyRefIds: [resolvedOwner.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenAllowanceFtNormalizedParams,
  ): Promise<TokenAllowanceFtBuildTransactionResult> {
    const { api } = args;
    const transaction = api.allowance.buildAllowanceApprove([
      new FtAllowanceEntry(
        normalisedParams.ownerAccountId,
        normalisedParams.spenderAccountId,
        normalisedParams.tokenId,
        normalisedParams.rawAmount,
      ),
    ]);
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenAllowanceFtNormalizedParams,
    buildTransactionResult: TokenAllowanceFtBuildTransactionResult,
  ): Promise<TokenAllowanceFtSignTransactionResult> {
    const { api } = args;
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.signerKeyRefId],
    );
    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenAllowanceFtNormalizedParams,
    _buildTransactionResult: TokenAllowanceFtBuildTransactionResult,
    signTransactionResult: TokenAllowanceFtSignTransactionResult,
  ): Promise<TokenAllowanceFtExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Fungible token allowance failed (tokenId: ${normalisedParams.tokenId}, owner: ${normalisedParams.ownerAccountId}, spender: ${normalisedParams.spenderAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: TokenAllowanceFtNormalizedParams,
    _buildTransactionResult: TokenAllowanceFtBuildTransactionResult,
    _signTransactionResult: TokenAllowanceFtSignTransactionResult,
    executeTransactionResult: TokenAllowanceFtExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenAllowanceFtOutput = {
      tokenId: normalisedParams.tokenId,
      ownerAccountId: normalisedParams.ownerAccountId,
      spenderAccountId: normalisedParams.spenderAccountId,
      amount: normalisedParams.rawAmount,
      transactionId: executeTransactionResult.transactionResult.transactionId,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenAllowanceFt(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenAllowanceFtCommand().execute(args);
}
