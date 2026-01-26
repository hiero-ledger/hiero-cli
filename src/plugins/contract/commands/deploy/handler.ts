/**
 * Contract Deploy Command Handler
 * Deploys a smart contract to the Hedera network
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { DeployContractOutput } from './output';

import { ContractCreateFlow, Hbar } from '@hashgraph/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { DeployContractInputSchema } from './input';
import { DeployContractOutputSchema } from './output';

/**
 * Reads bytecode from a file, supporting both hex-encoded and binary formats
 */
async function readBytecodeFile(filepath: string): Promise<string> {
  // Resolve path
  const resolvedPath =
    filepath.includes('/') || filepath.includes('\\')
      ? filepath
      : path.resolve(filepath);

  const buffer = await fs.readFile(resolvedPath);

  // Try to detect if it's hex-encoded text
  const content = buffer.toString('utf-8').trim();
  if (/^(0x)?[0-9a-fA-F]+$/.test(content)) {
    // It's hex-encoded, return without 0x prefix
    return content.replace(/^0x/, '');
  }

  // It's binary, convert to hex
  return buffer.toString('hex');
}

/**
 * Parse HBAR amount string
 * Supports "10" for HBAR or "10t" for tinybars
 */
function parseHbarAmount(amount: string): Hbar {
  const trimmed = amount.trim().toLowerCase();
  if (trimmed.endsWith('t')) {
    // Use string for fromTinybars to avoid precision issues
    const tinybars = trimmed.slice(0, -1);
    return Hbar.fromTinybars(tinybars);
  }
  return new Hbar(Number(trimmed));
}

export async function deployContractHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Validate input
  const validArgs = DeployContractInputSchema.parse(args.args);

  const bytecodeFile = validArgs['bytecode-file'];
  const gas = validArgs.gas;
  const constructorParamsRaw = validArgs['constructor-params'];
  const initialBalanceRaw = validArgs['initial-balance'];
  const memo = validArgs.memo;

  logger.info(`Deploying smart contract from: ${bytecodeFile}`);

  try {
    // Read bytecode from file
    logger.debug(`Reading bytecode from file: ${bytecodeFile}`);
    const bytecode = await readBytecodeFile(bytecodeFile);
    const bytecodeSize = bytecode.length / 2; // Hex is 2 chars per byte

    logger.info(`Bytecode size: ${bytecodeSize} bytes`);

    // Get the Hedera client via kms service
    const network = api.network.getCurrentNetwork();
    const client = api.kms.createClient(network);

    // Create the contract using ContractCreateFlow
    // This handles file creation, chunking, and cleanup automatically
    const contractCreate = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setGas(gas);

    // Set optional parameters
    if (initialBalanceRaw) {
      const initialBalance = parseHbarAmount(initialBalanceRaw);
      contractCreate.setInitialBalance(initialBalance);
      logger.debug(`Initial balance: ${initialBalance.toString()}`);
    }

    if (memo) {
      contractCreate.setContractMemo(memo);
      logger.debug(`Memo: ${memo}`);
    }

    // TODO: Handle constructor parameters if provided
    // This would require parsing the JSON array and using ContractFunctionParameters
    if (constructorParamsRaw) {
      logger.warn(
        'Constructor parameters are not yet fully supported - deploying without them',
      );
    }

    logger.info('Executing contract deployment transaction...');
    const txResponse = await contractCreate.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (!receipt.contractId) {
      throw new Error('Contract deployment failed - no contract ID returned');
    }

    const contractId = receipt.contractId.toString();

    logger.info(`Contract deployed successfully: ${contractId}`);

    const outputData: DeployContractOutput = DeployContractOutputSchema.parse({
      contractId,
      transactionId: txResponse.transactionId.toString(),
      bytecodeSize,
      memo,
      timestamp: new Date().toISOString(),
    });

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to deploy smart contract', error),
    };
  }
}
