/**
 * History List Command Handler
 * Lists transaction history for an account using the Mirror Node API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ListHistoryOutput, TransactionRecord } from './output';

import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { ListHistoryInputSchema } from './input';

interface TransactionsAPIResponse {
  transactions: Array<{
    transaction_id: string;
    consensus_timestamp: string;
    charged_tx_fee: number;
    memo_base64?: string;
    result: string;
    name: string;
    transfers?: Array<{
      account: string;
      amount: number;
    }>;
    token_transfers?: Array<{
      account: string;
      amount: number;
      token_id: string;
    }>;
  }>;
  links?: {
    next?: string;
  };
}

const NetworkToBaseUrl = new Map<SupportedNetwork, string>([
  [
    SupportedNetwork.MAINNET,
    'https://mainnet-public.mirrornode.hedera.com/api/v1',
  ],
  [SupportedNetwork.TESTNET, 'https://testnet.mirrornode.hedera.com/api/v1'],
  [
    SupportedNetwork.PREVIEWNET,
    'https://previewnet.mirrornode.hedera.com/api/v1',
  ],
  [SupportedNetwork.LOCALNET, 'http://localhost:5551/api/v1'],
]);

export async function listHistoryHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  logger.info('[History] List command invoked');

  try {
    // Parse and validate args
    const validArgs = ListHistoryInputSchema.parse(args.args);

    const accountIdOrName = validArgs.account;
    const limit = validArgs.limit || 25;
    const typeFilter = validArgs.type;
    const resultFilter = validArgs.result || 'all';

    // Resolve account identifier
    let accountId = accountIdOrName;
    const network = api.network.getCurrentNetwork();

    // Check if it's a stored account name
    const account = api.alias.resolve(
      accountIdOrName,
      ALIAS_TYPE.Account,
      network,
    );
    if (account && account.entityId) {
      accountId = account.entityId;
      logger.info(`Found account in state: ${account.alias}`);
    } else {
      const accountIdParseResult = EntityIdSchema.safeParse(accountIdOrName);
      if (!accountIdParseResult.success) {
        return {
          status: Status.Failure,
          errorMessage: `Account not found with ID or alias: ${accountIdOrName}`,
        };
      }
      accountId = accountIdParseResult.data;
    }

    // Get base URL for current network
    const baseUrl = NetworkToBaseUrl.get(network);
    if (!baseUrl) {
      return {
        status: Status.Failure,
        errorMessage: `Network type ${network} not supported`,
      };
    }

    // Build query parameters
    const queryParams: string[] = [`account.id=${accountId}`, `limit=${limit}`];

    if (typeFilter && typeFilter !== 'all') {
      queryParams.push(`transactiontype=${typeFilter.toUpperCase()}`);
    }

    if (resultFilter !== 'all') {
      queryParams.push(`result=${resultFilter}`);
    }

    const url = `${baseUrl}/transactions?${queryParams.join('&')}`;
    logger.info(`[History] Fetching transactions from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch transactions: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TransactionsAPIResponse;

    // Transform API response to output format
    const transactions: TransactionRecord[] = data.transactions.map((tx) => {
      const record: TransactionRecord = {
        transactionId: tx.transaction_id,
        consensusTimestamp: tx.consensus_timestamp,
        type: tx.name,
        result: tx.result,
        chargedFee: tx.charged_tx_fee,
      };

      // Decode memo if present
      if (tx.memo_base64) {
        try {
          record.memo = Buffer.from(tx.memo_base64, 'base64').toString('utf-8');
        } catch {
          // Ignore decode errors
        }
      }

      // Include transfers if present
      if (tx.transfers && tx.transfers.length > 0) {
        record.transfers = tx.transfers.map((t) => ({
          account: t.account,
          amount: t.amount,
        }));
      }

      // Include token transfers if present
      if (tx.token_transfers && tx.token_transfers.length > 0) {
        record.tokenTransfers = tx.token_transfers.map((t) => ({
          account: t.account,
          amount: t.amount,
          tokenId: t.token_id,
        }));
      }

      return record;
    });

    logger.info(`[History] Found ${transactions.length} transactions`);

    const outputData: ListHistoryOutput = {
      accountId,
      network,
      transactions,
      totalCount: transactions.length,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get transaction history', error),
    };
  }
}
