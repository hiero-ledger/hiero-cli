import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';
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
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { isRawUnits } from '@/core/utils/amount-helpers';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { TokenAllowanceFtInputSchema } from './input';

export const TOKEN_ALLOWANCE_FT_COMMAND_NAME = 'token_allowance-ft';

export class TokenAllowanceFtCommand extends BaseTransactionCommand<
  TokenAllowanceFtNormalizedParams,
  TokenAllowanceFtBuildTransactionResult,
  TokenAllowanceFtSignTransactionResult,
  TokenAllowanceFtExecuteTransactionResult
> {
  constructor(
    private readonly tokenReferenceService: TokenReferenceService,
    private readonly tokenStateService: TokenStateService,
  ) {
    super(TOKEN_ALLOWANCE_FT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenAllowanceFtNormalizedParams> {
    const { api } = args;
    const validArgs = TokenAllowanceFtInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = this.tokenReferenceService.resolveToken(
      validArgs.token,
      network,
    );
    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;
    let tokenDecimals = 0;
    if (!isRawUnits(validArgs.amount)) {
      const tokenInfoStorage = this.tokenStateService.getToken(tokenId);
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

    const resolvedSpender =
      await this.tokenReferenceService.resolveDestinationAccount(
        validArgs.spender,
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

    api.logger.info(
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
  const { api } = args;
  return new TokenAllowanceFtCommand(
    new TokenReferenceServiceImpl(api.identityResolution),
    new TokenStateServiceImpl(api.state, api.logger, api.receipt, api.alias),
  ).execute(args);
}
