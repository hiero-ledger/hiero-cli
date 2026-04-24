import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { HbarAllowanceOutput } from './output';
import type {
  AllowanceBuildTransactionResult,
  AllowanceExecuteTransactionResult,
  AllowanceNormalizedParams,
  AllowanceSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { processBalanceInput } from '@/core/utils/process-balance-input';

import { HbarAllowanceInputSchema } from './input';

export const HBAR_ALLOWANCE_COMMAND_NAME = 'hbar_allowance';

export async function hbarAllowance(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new HbarAllowanceCommand().execute(args);
}

export class HbarAllowanceCommand extends BaseTransactionCommand<
  AllowanceNormalizedParams,
  AllowanceBuildTransactionResult,
  AllowanceSignTransactionResult,
  AllowanceExecuteTransactionResult
> {
  constructor() {
    super(HBAR_ALLOWANCE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<AllowanceNormalizedParams> {
    const { api, logger } = args;

    logger.info('[HBAR] Allowance command invoked');

    const validArgs = HbarAllowanceInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const network = api.network.getCurrentNetwork();
    const amountTinybar = processBalanceInput(validArgs.amount, HBAR_DECIMALS);

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
      `[HBAR] Approving ${amountTinybar} tinybars for spender ${resolvedSpender.accountId}`,
    );

    return {
      network,
      amountTinybar,
      ownerAccountId: resolvedOwner.accountId,
      spenderAccountId: resolvedSpender.accountId,
      keyRefIds: [resolvedOwner.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalizedParams: AllowanceNormalizedParams,
  ): Promise<AllowanceBuildTransactionResult> {
    const { api } = args;

    const result = api.hbar.createHbarAllowanceTransaction({
      ownerAccountId: normalizedParams.ownerAccountId,
      spenderAccountId: normalizedParams.spenderAccountId,
      amountTinybar: normalizedParams.amountTinybar,
    });

    return { transaction: result.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalizedParams: AllowanceNormalizedParams,
    buildResult: AllowanceBuildTransactionResult,
  ): Promise<AllowanceSignTransactionResult> {
    const signedTransaction = await args.api.txSign.sign(
      buildResult.transaction,
      normalizedParams.keyRefIds,
    );
    return { signedTransaction } as AllowanceSignTransactionResult;
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalizedParams: AllowanceNormalizedParams,
    _buildResult: AllowanceBuildTransactionResult,
    signResult: AllowanceSignTransactionResult,
  ): Promise<AllowanceExecuteTransactionResult> {
    const result = await args.api.txExecute.execute(
      signResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `HBAR allowance failed (owner: ${normalizedParams.ownerAccountId}, spender: ${normalizedParams.spenderAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return result;
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalizedParams: AllowanceNormalizedParams,
    _buildResult: AllowanceBuildTransactionResult,
    _signResult: AllowanceSignTransactionResult,
    executeResult: AllowanceExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { logger } = args;

    logger.info(
      `[HBAR] Allowance approved successfully, txId=${executeResult.transactionId}`,
    );

    const outputData: HbarAllowanceOutput = {
      ownerAccountId: normalizedParams.ownerAccountId,
      spenderAccountId: normalizedParams.spenderAccountId,
      amountTinybar: normalizedParams.amountTinybar,
      transactionId: executeResult.transactionId || '',
      network: normalizedParams.network,
    };

    return { result: outputData };
  }
}
