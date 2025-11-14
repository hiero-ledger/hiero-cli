/**
 * Account Import Command Handler
 * Handles importing existing accounts using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import { ImportAccountOutput } from './output';

export async function importAccount(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper
  const accountState = new ZustandAccountStateHelper(api.state, logger);

  // Extract command arguments
  const accountId = args.args.id as string;
  const privateKey = args.args.key as string;
  const alias = (args.args.name as string) || '';

  // Check if name already exists on the current network
  const network = api.network.getCurrentNetwork();
  api.alias.availableOrThrow(alias, network);

  // Generate a unique name for the account
  const name = alias || `imported-${accountId.replace(/\./g, '-')}`;
  logger.log(`Importing account: ${name} (${accountId})`);

  try {
    // Check if account name already exists
    if (accountState.hasAccount(name)) {
      throw new Error(`Account with name '${name}' already exists`);
    }

    // No name resolution needed for import

    // Get account info from mirror node
    const accountInfo = await api.mirror.getAccount(accountId);

    // Securely store the private key in credentials storage
    const { keyRefId, publicKey } = api.kms.importPrivateKey(privateKey, [
      `account:${name}`,
    ]);

    // Register name if provided
    if (alias) {
      api.alias.register({
        alias,
        type: 'account',
        network: api.network.getCurrentNetwork() as
          | 'mainnet'
          | 'testnet'
          | 'previewnet',
        entityId: accountId,
        publicKey,
        keyRefId,
        createdAt: new Date().toISOString(),
      });
    }

    // Create account object (no private key in plugin state)
    const account = {
      name,
      accountId,
      type: 'ECDSA' as 'ECDSA' | 'ED25519', // Default type since key info not available in new API
      publicKey: publicKey,
      evmAddress:
        accountInfo.evmAddress || '0x0000000000000000000000000000000000000000',
      solidityAddress: accountId, // Simplified for mock
      solidityAddressFull: `0x${accountId}`,
      keyRefId,
      network: api.network.getCurrentNetwork() as
        | 'mainnet'
        | 'testnet'
        | 'previewnet',
    };

    // Store account in state using the helper
    accountState.saveAccount(name, account);

    // Prepare output data
    const outputData: ImportAccountOutput = {
      accountId,
      name: account.name,
      type: account.type,
      ...(alias && { alias }),
      network: account.network,
      balance: BigInt(accountInfo.balance.balance.toString()),
      evmAddress: account.evmAddress,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to import account', error),
    };
  }
}
