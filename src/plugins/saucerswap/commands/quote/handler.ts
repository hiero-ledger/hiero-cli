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
  ensureSaucerSwapNetwork,
  getQuoterId,
  getTokenContractId,
  getWhbarTokenId,
  POOL_FEE_TIER_30_BP,
  QUOTER_ABI,
} from '@/plugins/saucerswap/constants';
import { encodePathHex } from '@/plugins/saucerswap/utils/path-encoding';

import { SwapQuoteInputSchema } from './input';

export async function swapQuoteHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;

  const validArgs = SwapQuoteInputSchema.parse(args.args);
  const rawNetwork = api.network.getCurrentNetwork();
  ensureSaucerSwapNetwork(rawNetwork);
  const whbarTokenId = getWhbarTokenId(rawNetwork);
  const quoterId = getQuoterId(rawNetwork);

  const tokenIn = validArgs.in.trim();
  const tokenOut = validArgs.out.trim();

  const inForPath = tokenIn.toUpperCase() === 'HBAR' ? whbarTokenId : tokenIn;
  const outForPath =
    tokenOut.toUpperCase() === 'HBAR' ? whbarTokenId : tokenOut;

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

  // HBAR ↔ WHBAR: wrap/unwrap is 1:1 (no DEX pool)
  if (inForPath === outForPath) {
    if (inForPath === whbarTokenId) {
      const outputData: SwapQuoteOutput = {
        network: rawNetwork,
        tokenIn: validArgs.in,
        tokenOut: validArgs.out,
        amountIn: validArgs.amount,
        amountOut: formatAmountOut(String(amountInWei)),
        amountOutRaw: String(amountInWei),
        gasEstimate: undefined,
      };
      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    }
    return {
      status: Status.Failure,
      errorMessage: `Quote failed: Input and output are the same token (${inForPath}). No pool exists.`,
    };
  }

  // Use WHBAR proxy contract ID in path so quoter finds the pool (token ID ≠ contract ID on Hedera).
  const whbarPathEntityId =
    getTokenContractId(rawNetwork, whbarTokenId) ?? whbarTokenId;

  const abiInterface = new Interface(QUOTER_ABI);
  const feeTiersToTry = [DEFAULT_POOL_FEE_TIER, POOL_FEE_TIER_30_BP];
  let lastError: unknown;

  for (const feeTier of feeTiersToTry) {
    const pathHex = encodePathHex(
      inForPath,
      outForPath,
      feeTier,
      whbarTokenId,
      whbarPathEntityId,
    );
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
        network: rawNetwork,
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
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes('CONTRACT_REVERT_EXECUTED')) {
        break;
      }

      // Fallback: try JSON-RPC eth_call (mirror node contract call can revert for some paths)
      try {
        const quoteViaRpc = await quoteExactInputViaRpc(
          api,
          quoterId,
          rawNetwork,
          abiInterface,
          pathBytes,
          amountInWei,
        );
        if (quoteViaRpc) {
          const outputData: SwapQuoteOutput = {
            network: rawNetwork,
            tokenIn: validArgs.in,
            tokenOut: validArgs.out,
            amountIn: validArgs.amount,
            amountOut: formatAmountOut(quoteViaRpc.amountOut),
            amountOutRaw: quoteViaRpc.amountOut,
            gasEstimate: quoteViaRpc.gasEstimate,
          };
          return {
            status: Status.Success,
            outputJson: JSON.stringify(outputData),
          };
        }
      } catch {
        // ignore RPC fallback failure, keep lastError from mirror
      }
    }
  }

  return {
    status: Status.Failure,
    errorMessage: formatError('Quote failed', lastError),
  };
}

/**
 * Call Quoter.quoteExactInput via Hedera JSON-RPC eth_call.
 * Used when mirror node /contracts/call returns CONTRACT_REVERT_EXECUTED for the same call.
 */
async function quoteExactInputViaRpc(
  api: CommandHandlerArgs['api'],
  quoterId: string,
  network: string,
  abiInterface: Interface,
  pathBytes: string,
  amountInWei: bigint,
): Promise<{ amountOut: string; gasEstimate?: string } | null> {
  const contractInfo = await api.mirror.getContractInfo(quoterId);
  const evmAddress = contractInfo.evm_address;
  if (!evmAddress) return null;

  const toHex = (
    evmAddress.startsWith('0x') ? evmAddress : `0x${evmAddress}`
  ).toLowerCase();
  const data = abiInterface.encodeFunctionData('quoteExactInput', [
    pathBytes,
    amountInWei,
  ]);
  const dataHex = (data.startsWith('0x') ? data : `0x${data}`).toLowerCase();

  const config = api.network.getNetworkConfig(network);
  const rpcUrl = config.rpcUrl;
  const body = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{ to: toHex, data: dataHex }, 'latest'],
    id: 1,
  });
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!response.ok) return null;

  const json = (await response.json()) as {
    result?: string;
    error?: { code: number; message: string };
  };
  if (json.error || !json.result || json.result === '0x') return null;

  const decoded = abiInterface.decodeFunctionResult(
    'quoteExactInput',
    json.result as `0x${string}`,
  );
  const amountOut = decoded[0] != null ? String(decoded[0]) : '0';
  const gasEstimate = decoded[3] != null ? String(decoded[3]) : undefined;
  return { amountOut, gasEstimate };
}

function formatAmountOut(raw: string): string {
  const n = BigInt(raw);
  if (n >= BigInt(1e8)) return (Number(n) / 1e8).toFixed(4);
  return raw;
}
