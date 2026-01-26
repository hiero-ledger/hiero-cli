/**
 * Contract Call Command Handler
 * Executes a read-only call to a smart contract function
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { CallContractOutput } from './output';

import {
  ContractCallQuery,
  ContractId,
  ContractFunctionParameters,
} from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { CallContractInputSchema } from './input';
import { CallContractOutputSchema } from './output';

/**
 * Parse function parameters from JSON array
 * Supports basic types: string, number, boolean, address (0x...)
 */
function buildFunctionParams(
  paramsJson: string | undefined,
): ContractFunctionParameters {
  const params = new ContractFunctionParameters();

  if (!paramsJson) {
    return params;
  }

  const parsed = JSON.parse(paramsJson) as unknown[];

  for (const param of parsed) {
    if (typeof param === 'string') {
      if (param.startsWith('0x') && param.length === 42) {
        // Ethereum address
        params.addAddress(param);
      } else {
        params.addString(param);
      }
    } else if (typeof param === 'number') {
      if (Number.isInteger(param)) {
        params.addInt256(param);
      } else {
        // Handle decimals as string to avoid precision issues
        params.addString(String(param));
      }
    } else if (typeof param === 'boolean') {
      params.addBool(param);
    } else if (typeof param === 'bigint') {
      // Convert bigint to number for SDK compatibility
      // Note: This may lose precision for very large numbers
      params.addInt256(Number(param));
    }
    // Arrays and objects would need more complex handling
  }

  return params;
}

/**
 * Try to decode the result bytes as common types
 */
function decodeResult(resultBytes: Uint8Array): string {
  if (resultBytes.length === 0) {
    return '(empty)';
  }

  // Try to decode as UTF-8 string
  try {
    const decoded = new TextDecoder().decode(resultBytes);
    if (/^[\x20-\x7E]*$/.test(decoded) && decoded.length > 0) {
      return decoded;
    }
  } catch {
    // Not a valid UTF-8 string
  }

  // If 32 bytes, might be a uint256 or address
  if (resultBytes.length === 32) {
    // Check if it looks like an address (last 20 bytes are the address, first 12 are zeros)
    const firstTwelve = resultBytes.slice(0, 12);
    if (firstTwelve.every((b) => b === 0)) {
      const address = '0x' + Buffer.from(resultBytes.slice(12)).toString('hex');
      return `address: ${address}`;
    }

    // Otherwise treat as uint256
    const hex = Buffer.from(resultBytes).toString('hex');
    const num = BigInt('0x' + hex);
    return `uint256: ${num.toString()}`;
  }

  // Return raw hex for unknown formats
  return '0x' + Buffer.from(resultBytes).toString('hex');
}

export async function callContractHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Validate input
  const validArgs = CallContractInputSchema.parse(args.args);

  const contractIdStr = validArgs.contract;
  const functionName = validArgs.function;
  const paramsJson = validArgs.params;
  const gas = validArgs.gas;

  logger.info(`Calling contract ${contractIdStr}.${functionName}()`);

  try {
    // Get the Hedera client via kms service
    const network = api.network.getCurrentNetwork();
    const client = api.kms.createClient(network);

    // Parse contract ID
    const contractId = ContractId.fromString(contractIdStr);

    // Build function parameters
    const functionParams = buildFunctionParams(paramsJson);

    // Create and execute the query
    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(gas)
      .setFunction(functionName, functionParams);

    logger.debug(`Executing contract call with gas: ${gas}`);
    const result = await query.execute(client);

    // Get result bytes
    const resultBytes = result.bytes;
    const resultHex = '0x' + Buffer.from(resultBytes).toString('hex');
    const decodedResult = decodeResult(resultBytes);

    logger.info(`Call completed, gas used: ${result.gasUsed.toNumber()}`);

    const outputData: CallContractOutput = CallContractOutputSchema.parse({
      contractId: contractIdStr,
      functionName,
      result: decodedResult,
      resultHex,
      gasUsed: result.gasUsed.toNumber(),
    });

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to call smart contract', error),
    };
  }
}
