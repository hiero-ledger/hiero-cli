/**
 * Quickstart Verify Command Handler
 * Runs diagnostic checks on the development environment
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { VerifyOutput, CheckResult } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { VerifyInputSchema } from './input';

// Minimum recommended balance in tinybars (1 HBAR = 100,000,000 tinybars)
const MIN_BALANCE_TINYBARS = 100_000_000n;
// Low balance warning threshold (10 HBAR)
const LOW_BALANCE_TINYBARS = 1_000_000_000n;

export async function verifyHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = VerifyInputSchema.parse(args.args);
  const runFull = validArgs.full;

  const network = api.network.getCurrentNetwork();
  const checks: CheckResult[] = [];
  let hasError = false;
  let hasWarning = false;

  logger.info(`Running verification on ${network}...`);

  // Check 1: Network configuration
  try {
    const currentNetwork = api.network.getCurrentNetwork();
    if (['testnet', 'previewnet', 'mainnet', 'localnet'].includes(currentNetwork)) {
      checks.push({
        name: 'Network Configuration',
        status: 'pass',
        message: `Using ${currentNetwork}`,
      });
    } else {
      checks.push({
        name: 'Network Configuration',
        status: 'fail',
        message: `Unknown network: ${currentNetwork}`,
      });
      hasError = true;
    }
  } catch (error) {
    checks.push({
      name: 'Network Configuration',
      status: 'fail',
      message: formatError('Failed to get network', error),
    });
    hasError = true;
  }

  // Check 2: Operator configuration
  const operator = api.network.getOperator(network);
  if (operator) {
    checks.push({
      name: 'Operator Configured',
      status: 'pass',
      message: `Account ${operator.accountId}`,
    });
  } else {
    checks.push({
      name: 'Operator Configured',
      status: 'fail',
      message: 'No operator set. Run "hiero network set-operator"',
    });
    hasError = true;
  }

  // Check 3: Mirror Node connectivity
  if (operator) {
    try {
      const balance = await api.mirror.getAccountHBarBalance(operator.accountId);
      const balanceHbar = Number(balance) / 100_000_000;

      checks.push({
        name: 'Mirror Node Connectivity',
        status: 'pass',
        message: `Connected successfully`,
      });

      // Check 4: Operator balance
      if (balance >= LOW_BALANCE_TINYBARS) {
        checks.push({
          name: 'Operator Balance',
          status: 'pass',
          message: `${balanceHbar.toFixed(2)} HBAR available`,
        });
      } else if (balance >= MIN_BALANCE_TINYBARS) {
        checks.push({
          name: 'Operator Balance',
          status: 'pass',
          message: `${balanceHbar.toFixed(2)} HBAR (consider adding more)`,
        });
        hasWarning = true;
      } else {
        checks.push({
          name: 'Operator Balance',
          status: 'fail',
          message: `Only ${balanceHbar.toFixed(2)} HBAR. Need at least 1 HBAR.`,
        });
        hasError = true;
      }
    } catch (error) {
      checks.push({
        name: 'Mirror Node Connectivity',
        status: 'fail',
        message: formatError('Connection failed', error),
      });
      hasError = true;

      checks.push({
        name: 'Operator Balance',
        status: 'skip',
        message: 'Skipped due to connectivity issues',
      });
    }
  } else {
    checks.push({
      name: 'Mirror Node Connectivity',
      status: 'skip',
      message: 'Skipped - no operator configured',
    });
    checks.push({
      name: 'Operator Balance',
      status: 'skip',
      message: 'Skipped - no operator configured',
    });
  }

  // Check 5 (Full mode only): Test transfer
  if (runFull && operator && !hasError) {
    try {
      logger.info('Running test transfer (self-transfer)...');

      // Do a small self-transfer to verify transaction signing works
      const transferAmount = 1n; // 1 tinybar
      const transferResult = await api.hbar.transferTinybar({
        from: operator.accountId,
        to: operator.accountId,
        amount: transferAmount,
      });

      const result = await api.txExecution.signAndExecute(
        transferResult.transaction,
      );

      if (result.success) {
        checks.push({
          name: 'Transaction Signing',
          status: 'pass',
          message: `Test transfer successful (${result.transactionId})`,
        });
      } else {
        checks.push({
          name: 'Transaction Signing',
          status: 'fail',
          message: 'Test transfer failed',
        });
        hasError = true;
      }
    } catch (error) {
      checks.push({
        name: 'Transaction Signing',
        status: 'fail',
        message: formatError('Test transfer failed', error),
      });
      hasError = true;
    }
  } else if (runFull) {
    checks.push({
      name: 'Transaction Signing',
      status: 'skip',
      message: 'Skipped due to previous errors',
    });
  }

  // Determine overall status
  let overallStatus: 'healthy' | 'warning' | 'error';
  if (hasError) {
    overallStatus = 'error';
  } else if (hasWarning) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'healthy';
  }

  const output: VerifyOutput = {
    network,
    overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  };

  return {
    status: hasError ? Status.Failure : Status.Success,
    outputJson: JSON.stringify(output),
    errorMessage: hasError ? 'Environment verification failed' : undefined,
  };
}
