/**
 * Account View Command Handler
 * Handles viewing account details using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ViewAccountOutput } from './output';

import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { ViewAccountInputSchema } from './input';

export async function viewAccount(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Parse and validate command arguments
  console.log(args.args);
  const validArgs = ViewAccountInputSchema.parse(args.args);
  console.log(validArgs);

  const accountIdOrNameOrAlias = validArgs.account;

  logger.info(`Viewing account details: ${accountIdOrNameOrAlias}`);

  try {
    // Resolve account identifier (could be name, account ID, or alias)
    let accountId = accountIdOrNameOrAlias;

    // First check if it's a stored account name
    const network = args.api.network.getCurrentNetwork();
    const account = args.api.alias.resolve(
      accountIdOrNameOrAlias,
      ALIAS_TYPE.Account,
      network,
    );
    if (account && account.entityId) {
      accountId = account.entityId;
      logger.info(`Found account in state: ${account.alias}`);
    } else {
      const accountIdParseResult = EntityIdSchema.safeParse(
        accountIdOrNameOrAlias,
      );

      if (!accountIdParseResult.success) {
        return {
          status: Status.Failure,
          errorMessage: `Account not found with ID or alias: ${accountIdOrNameOrAlias}`,
        };
      }

      accountId = accountIdParseResult.data;
    }

    // Get account info from mirror node
    const accountInfo = await api.mirror.getAccount(accountId);

    // Prepare output data
    const outputData: ViewAccountOutput = {
      accountId: accountInfo.accountId,
      balance: BigInt(accountInfo.balance.balance.toString()),
      ...(accountInfo.evmAddress && { evmAddress: accountInfo.evmAddress }),
      ...(accountInfo.accountPublicKey && {
        publicKey: accountInfo.accountPublicKey,
      }),
      balanceTimestamp: accountInfo.balance.timestamp,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to view account', error),
    };
  }
}
