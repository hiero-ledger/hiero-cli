/**
 * SaucerSwap swap quote: read-only call to quoter contract.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { SwapQuoteOutput } from './output';

import { Interface } from 'ethers';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import {
  DEFAULT_POOL_FEE_TIER,
  getQuoterId,
  getWhbarTokenId,
  QUOTER_ABI,
} from '@/plugins/saucerswap/constants';
import { encodePathHex } from '@/plugins/saucerswap/utils/path-encoding';

import { SwapQuoteInputSchema } from './input';

export async function swapQuoteHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;

  const validArgs = SwapQuoteInputSchema.parse(args.args);
  const network = api.network.getCurrentNetwork();
  const whbarTokenId = getWhbarTokenId(network);
  const quoterId = getQuoterId(network);

  const tokenIn = validArgs.in.trim();
  const tokenOut = validArgs.out.trim();

  const inForPath = tokenIn.toUpperCase() === 'HBAR' ? whbarTokenId : tokenIn;
  const outForPath =
    tokenOut.toUpperCase() === 'HBAR' ? whbarTokenId : tokenOut;

  const pathHex = encodePathHex(
    inForPath,
    outForPath,
    DEFAULT_POOL_FEE_TIER,
    whbarTokenId,
  );

  // Amount: assume display units for HBAR (8 decimals), for tokens we'd need decimals lookup
  const amountStr = validArgs.amount.trim();
  const isTinybar = amountStr.endsWith('t');
  const amountInWei = isTinybar
    ? BigInt(amountStr.slice(0, -1))
    : BigInt(Math.floor(parseFloat(amountStr) * 1e8)); // 8 decimals for HBAR/WHBAR

  if (amountInWei <= 0n) {
    return {
      status: Status.Failure,
      errorMessage: 'Amount must be positive',
    };
  }

  const abiInterface = new Interface(QUOTER_ABI);
  const pathBytes = pathHex.startsWith('0x') ? pathHex : `0x${pathHex}`;

  try {
    const result = await api.contractQuery.queryContractFunction({
      abiInterface,
      contractIdOrEvmAddress: quoterId,
      functionName: 'quoteExactInput',
      args: [pathBytes, amountInWei],
    });

    const decoded = result.queryResult;
    const amountOut = decoded[0] != null ? String(decoded[0]) : '0';
    const gasEstimate = decoded[3] != null ? String(decoded[3]) : undefined;

    const outputData: SwapQuoteOutput = {
      network,
      tokenIn: validArgs.in,
      tokenOut: validArgs.out,
      amountIn: validArgs.amount,
      amountOut: formatAmountOut(amountOut),
      amountOutRaw: amountOut,
      gasEstimate,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Quote failed', error),
    };
  }
}

function formatAmountOut(raw: string): string {
  const n = BigInt(raw);
  if (n >= BigInt(1e8)) return (Number(n) / 1e8).toFixed(4);
  return raw;
}
