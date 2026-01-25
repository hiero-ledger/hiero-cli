/**
 * Contract Info Command Handler
 * Retrieves information about a smart contract from the Mirror Node
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractInfoOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { ContractInfoInputSchema } from './input';
import { ContractInfoOutputSchema } from './output';

/**
 * Convert tinybars to HBAR string
 */
function formatHbar(tinybars: bigint | number | string): string {
  const tinybarsBigInt =
    typeof tinybars === 'bigint' ? tinybars : BigInt(tinybars);
  const hbar = Number(tinybarsBigInt) / 100_000_000;
  return hbar.toFixed(8).replace(/\.?0+$/, '');
}

export async function contractInfoHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Validate input
  const validArgs = ContractInfoInputSchema.parse(args.args);

  const contractId = validArgs.contract;

  logger.info(`Getting contract info for: ${contractId}`);

  try {
    // Query Mirror Node for contract info
    const contractInfo = await api.mirror.getContractInfo(contractId);

    logger.debug(`Contract info received: ${JSON.stringify(contractInfo)}`);

    // Get account balance if available
    let balance = '0';
    try {
      const balanceTinybars =
        await api.mirror.getAccountHBarBalance(contractId);
      balance = formatHbar(balanceTinybars);
    } catch {
      // Contract might not have a balance or be deleted
      logger.debug('Could not retrieve contract balance');
    }

    const outputData: ContractInfoOutput = ContractInfoOutputSchema.parse({
      contractId: contractInfo.contract_id,
      evmAddress: contractInfo.evm_address,
      balance,
      deleted: contractInfo.deleted,
      memo: contractInfo.memo || undefined,
      adminKey: contractInfo.admin_key?.key,
      autoRenewAccountId: contractInfo.auto_renew_account,
      autoRenewPeriod: contractInfo.auto_renew_period,
      createdTimestamp: contractInfo.created_timestamp,
      expirationTimestamp: contractInfo.expiration_timestamp,
      maxAutomaticTokenAssociations:
        contractInfo.max_automatic_token_associations,
      // Note: runtime_bytecode_hash would need to be fetched separately via contract/results endpoint
    });

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get contract info', error),
    };
  }
}
