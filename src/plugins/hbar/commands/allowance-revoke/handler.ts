import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { HbarAllowanceRevokeOutput } from './output';
import type {
  AllowanceRevokeBuildTransactionResult,
  AllowanceRevokeExecuteTransactionResult,
  AllowanceRevokeNormalizedParams,
  AllowanceRevokeSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';

import { HbarAllowanceRevokeInputSchema } from './input';

export const HBAR_ALLOWANCE_REVOKE_COMMAND_NAME = 'hbar_allowance_revoke';

export async function hbarAllowanceRevoke(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new HbarAllowanceRevokeCommand().execute(args);
}

export class HbarAllowanceRevokeCommand extends BaseTransactionCommand<
  AllowanceRevokeNormalizedParams,
  AllowanceRevokeBuildTransactionResult,
  AllowanceRevokeSignTransactionResult,
  AllowanceRevokeExecuteTransactionResult
> {
  constructor() {
    super(HBAR_ALLOWANCE_REVOKE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<AllowanceRevokeNormalizedParams> {
    const { api, logger } = args;

    logger.info('[HBAR] Allowance revoke command invoked');

    const validArgs = HbarAllowanceRevokeInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const network = api.network.getCurrentNetwork();

    const resolvedOwner = await api.keyResolver.resolveAccountCredentials(
      validArgs.owner,
      keyManager,
      true,
    );

    const resolvedSpender = await api.keyResolver.resolveDestination(
      validArgs.spender,
      keyManager,
    );

    if (!resolvedSpender.accountId) {
      throw new NotFoundError(
        'Spender must resolve to an accountId — EVM-address-only accounts are not supported',
        { context: { evmAddress: resolvedSpender.evmAddress } },
      );
    }

    logger.info(
      `[HBAR] Revoking allowance for spender ${resolvedSpender.accountId}`,
    );

    return {
      network,
      ownerAccountId: resolvedOwner.accountId,
      spenderAccountId: resolvedSpender.accountId,
      keyRefIds: [resolvedOwner.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalizedParams: AllowanceRevokeNormalizedParams,
  ): Promise<AllowanceRevokeBuildTransactionResult> {
    const { api } = args;

    const result = api.hbar.createHbarAllowanceTransaction({
      ownerAccountId: normalizedParams.ownerAccountId,
      spenderAccountId: normalizedParams.spenderAccountId,
      amountTinybar: 0n,
    });

    return { transaction: result.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalizedParams: AllowanceRevokeNormalizedParams,
    buildResult: AllowanceRevokeBuildTransactionResult,
  ): Promise<AllowanceRevokeSignTransactionResult> {
    const signedTransaction = await args.api.txSign.sign(
      buildResult.transaction,
      normalizedParams.keyRefIds,
    );
    return { signedTransaction } as AllowanceRevokeSignTransactionResult;
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalizedParams: AllowanceRevokeNormalizedParams,
    _buildResult: AllowanceRevokeBuildTransactionResult,
    signResult: AllowanceRevokeSignTransactionResult,
  ): Promise<AllowanceRevokeExecuteTransactionResult> {
    const result = await args.api.txExecute.execute(
      signResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `HBAR allowance revoke failed (owner: ${normalizedParams.ownerAccountId}, spender: ${normalizedParams.spenderAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return result;
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalizedParams: AllowanceRevokeNormalizedParams,
    _buildResult: AllowanceRevokeBuildTransactionResult,
    _signResult: AllowanceRevokeSignTransactionResult,
    executeResult: AllowanceRevokeExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { logger } = args;

    logger.info(
      `[HBAR] Allowance revoked successfully, txId=${executeResult.transactionId}`,
    );

    const outputData: HbarAllowanceRevokeOutput = {
      ownerAccountId: normalizedParams.ownerAccountId,
      spenderAccountId: normalizedParams.spenderAccountId,
      amountTinybar: 0n,
      transactionId: executeResult.transactionId || '',
      network: normalizedParams.network,
    };

    return { result: outputData };
  }
}
