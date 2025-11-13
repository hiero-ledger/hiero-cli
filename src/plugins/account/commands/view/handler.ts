/**
 * Account View Command Handler
 * Handles viewing account details using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../utils/errors';
import { ViewAccountOutput } from './output';
import { AliasType } from '../../../../core/services/alias/alias-service.interface';
import { EntityIdSchema } from '../../../../core/schemas';

export async function viewAccount(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Extract command arguments
  const accountIdOrNameOrAlias = args.args.account as string;

  logger.log(`Viewing account details: ${accountIdOrNameOrAlias}`);

  try {
    // Resolve account identifier (could be name, account ID, or alias)
    let accountId = accountIdOrNameOrAlias;

    // First check if it's a stored account name
    const network = args.api.network.getCurrentNetwork();
    const account = args.api.alias.resolve(
      accountIdOrNameOrAlias,
      AliasType.Account,
      network,
    );
    if (account && account.entityId) {
      accountId = account.entityId;
      logger.log(`Found account in state: ${account.alias}`);
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
