/**
 * Quickstart Init Command Handler
 * Initializes the CLI for testnet development with one command
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { InitOutput } from './output';

import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { InitInputSchema } from './input';

const TESTNET_MIRROR = 'https://testnet.mirrornode.hedera.com';
const PREVIEWNET_MIRROR = 'https://previewnet.mirrornode.hedera.com';

const NETWORK_MAP: Record<string, SupportedNetwork> = {
  testnet: SupportedNetwork.TESTNET,
  previewnet: SupportedNetwork.PREVIEWNET,
};

export async function initHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = InitInputSchema.parse(args.args);
  const targetNetworkStr = validArgs.network;
  const skipVerify = validArgs.skipVerify;

  // Validate network choice
  if (!['testnet', 'previewnet'].includes(targetNetworkStr)) {
    return {
      status: Status.Failure,
      errorMessage: `Invalid network "${targetNetworkStr}". Quickstart only supports testnet and previewnet.`,
    };
  }

  const targetNetwork = NETWORK_MAP[targetNetworkStr];

  logger.info(`Initializing quickstart for ${targetNetworkStr}...`);

  try {
    // Get current network for comparison
    const previousNetwork = api.network.getCurrentNetwork();

    // Switch to target network
    api.network.switchNetwork(targetNetwork);
    logger.info(`Switched to ${targetNetworkStr}`);

    // Check if operator is configured
    const operator = api.network.getOperator(targetNetwork);
    if (!operator) {
      const output: InitOutput = {
        network: targetNetworkStr,
        previousNetwork:
          previousNetwork !== targetNetwork ? previousNetwork : undefined,
        operatorId: 'Not configured',
        operatorBalance: '0',
        mirrorNodeUrl:
          targetNetworkStr === 'testnet' ? TESTNET_MIRROR : PREVIEWNET_MIRROR,
        networkStatus: 'error',
        message:
          'No operator configured. Please run "hiero network set-operator" to configure credentials.',
      };

      return {
        status: Status.Failure,
        outputJson: JSON.stringify(output),
        errorMessage:
          'No operator configured for this network. Please configure operator credentials.',
      };
    }

    // Verify connectivity (unless skipped)
    let operatorBalance = '0';
    let networkStatus: 'connected' | 'error' = 'connected';
    let message = 'Ready for development!';

    if (!skipVerify) {
      try {
        const balance = await api.mirror.getAccountHBarBalance(
          operator.accountId,
        );
        // Convert tinybars to HBAR
        operatorBalance = (Number(balance) / 100_000_000).toFixed(2);

        if (Number(balance) < 100_000_000) {
          // Less than 1 HBAR
          message =
            'Warning: Low operator balance. Consider adding more HBAR from the faucet.';
        }

        logger.info(`Operator balance: ${operatorBalance} HBAR`);
      } catch (error) {
        networkStatus = 'error';
        message = `Network connectivity issue: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      message = 'Connectivity verification skipped.';
    }

    const output: InitOutput = {
      network: targetNetworkStr,
      previousNetwork:
        previousNetwork !== targetNetwork ? previousNetwork : undefined,
      operatorId: operator.accountId,
      operatorBalance,
      mirrorNodeUrl:
        targetNetworkStr === 'testnet' ? TESTNET_MIRROR : PREVIEWNET_MIRROR,
      networkStatus,
      message,
    };

    return {
      status: networkStatus === 'connected' ? Status.Success : Status.Failure,
      outputJson: JSON.stringify(output),
      errorMessage: networkStatus === 'error' ? message : undefined,
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to initialize quickstart', error),
    };
  }
}
