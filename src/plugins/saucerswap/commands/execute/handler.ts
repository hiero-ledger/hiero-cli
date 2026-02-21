/**
 * SaucerSwap swap execute: approve (if token in) + router exactInput.
 * Supports HBAR → token and token → HBAR (single hop).
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { SwapExecuteOutput } from './output';

import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
  Long,
} from '@hashgraph/sdk';

import { getBytes, Interface } from 'ethers';

import { EntityReferenceType } from '@/core/types/shared.types';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import {
  DEFAULT_POOL_FEE_TIER,
  getQuoterId,
  getRouterId,
  getTokenContractId,
  getWhbarHelperId,
  getWhbarTokenId,
  POOL_FEE_TIER_30_BP,
  QUOTER_ABI,
  ROUTER_ABI,
} from '@/plugins/saucerswap/constants';
import {
  encodePath,
  encodePathHex,
} from '@/plugins/saucerswap/utils/path-encoding';

import { SwapExecuteInputSchema } from './input';

const ROUTER_GAS = 400_000;

/**
 * Convert bigint to Long for Hedera SDK addUint256.
 * Long is a 64-bit integer type re-exported by @hashgraph/sdk and is an
 * accepted overload of addUint256. This avoids the silent precision loss
 * of Number() for values over 2^53 (~90k HBAR in tinybar units).
 * Long handles up to 2^63-1, which is sufficient for all realistic swap amounts.
 */
function toLong(value: bigint): Long {
  return Long.fromString(value.toString());
}

export async function swapExecuteHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;

  const validArgs = SwapExecuteInputSchema.parse(args.args);
  const network = api.network.getCurrentNetwork();
  const whbarTokenId = getWhbarTokenId(network);
  const quoterId = getQuoterId(network);
  const routerId = getRouterId(network);

  const tokenIn = validArgs.in.trim();
  const tokenOut = validArgs.out.trim();
  const inForPath = tokenIn.toUpperCase() === 'HBAR' ? whbarTokenId : tokenIn;
  const outForPath =
    tokenOut.toUpperCase() === 'HBAR' ? whbarTokenId : tokenOut;

  const amountStr = validArgs.amount.trim();
  const isTinybar = amountStr.endsWith('t');
  const amountInWei = isTinybar
    ? BigInt(amountStr.slice(0, -1))
    : BigInt(Math.floor(parseFloat(amountStr) * 1e8));

  if (amountInWei <= 0n) {
    return {
      status: Status.Failure,
      errorMessage: 'Amount must be positive',
    };
  }

  // ── HBAR → WHBAR: wrap via WhbarHelper.deposit() ──────────────────────────
  if (inForPath === outForPath && inForPath === whbarTokenId) {
    if (tokenIn.toUpperCase() === 'HBAR') {
      const operator = api.network.getOperator(network);
      if (!operator) {
        return {
          status: Status.Failure,
          errorMessage: 'No operator set. Use hcli network set-operator.',
        };
      }
      const whbarHelperId = getWhbarHelperId(network);
      const payableHbar = Number(amountInWei) / 1e8;
      const tx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(whbarHelperId))
        .setGas(100_000)
        .setPayableAmount(new Hbar(payableHbar))
        .setFunction('deposit');

      const result = await api.txExecution.signAndExecute(tx);
      if (!result.success) {
        return {
          status: Status.Failure,
          errorMessage:
            result.receipt?.status?.status?.toString() ?? 'Wrap failed',
        };
      }
      const outputData: SwapExecuteOutput = {
        network,
        transactionId: result.transactionId ?? '',
        tokenIn: validArgs.in,
        tokenOut: validArgs.out,
        amountIn: validArgs.amount,
        amountOut: String(amountInWei),
      };
      return { status: Status.Success, outputJson: JSON.stringify(outputData) };
    }
    return {
      status: Status.Failure,
      errorMessage:
        'WHBAR→HBAR (unwrap) is not supported. Use a wallet or SaucerSwap UI.',
    };
  }

  if (inForPath === outForPath) {
    return {
      status: Status.Failure,
      errorMessage: `Swap failed: Input and output are the same token (${inForPath}). No pool exists.`,
    };
  }

  // ── Quote (try 0.05% then 0.30% fee tier; some pairs only have one) ─────────
  const slippagePercent = parseFloat(validArgs.slippage ?? '0.5');
  const slippageMultiplier = 1 - slippagePercent / 100;

  const whbarPathEntityId =
    getTokenContractId(network, whbarTokenId) ?? whbarTokenId;
  const abiInterface = new Interface(QUOTER_ABI);
  const feeTiersToTry = [DEFAULT_POOL_FEE_TIER, POOL_FEE_TIER_30_BP];
  let amountOutWei: bigint = 0n;
  let resolvedFeeTier: number | null = null;

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
      const quoteResult = await api.contractQuery.queryContractFunction({
        abiInterface,
        contractIdOrEvmAddress: quoterId,
        functionName: 'quoteExactInput',
        args: [pathBytes, amountInWei],
      });
      amountOutWei = BigInt(String(quoteResult.queryResult[0]));
      resolvedFeeTier = feeTier;
      break;
    } catch {
      continue;
    }
  }

  if (resolvedFeeTier == null) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        'Quote failed (check pair/liquidity or fee tier)',
        new Error('CONTRACT_REVERT_EXECUTED'),
      ),
    };
  }

  const pathBytesUint8 = encodePath(
    inForPath,
    outForPath,
    resolvedFeeTier,
    whbarTokenId,
    whbarPathEntityId,
  );
  const pathHex = encodePathHex(
    inForPath,
    outForPath,
    resolvedFeeTier,
    whbarTokenId,
    whbarPathEntityId,
  );
  const pathBytes = pathHex.startsWith('0x') ? pathHex : `0x${pathHex}`;

  // FIX: use bigint arithmetic throughout — avoid Number() for financial values.
  // slippageMultiplier is a float so we scale to basis points (10000) to stay in integers.
  const slippageBps = BigInt(Math.round(slippageMultiplier * 10_000));
  const amountOutMinimum = (amountOutWei * slippageBps) / 10_000n;

  // ── Operator / recipient ───────────────────────────────────────────────────
  const operator = api.network.getOperator(network);
  if (!operator) {
    return {
      status: Status.Failure,
      errorMessage: 'No operator set. Use hcli network set-operator.',
    };
  }

  const accountInfo = await api.mirror.getAccount(operator.accountId);
  const recipientEvm = accountInfo.evmAddress;
  if (!recipientEvm) {
    return {
      status: Status.Failure,
      errorMessage:
        'Operator account has no EVM address (need ECDSA key for swaps).',
    };
  }

  const recipientHex = recipientEvm.startsWith('0x')
    ? recipientEvm
    : `0x${recipientEvm}`;
  const deadline = Math.floor(Date.now() / 1000) + 1200;

  // ── HBAR → token: use multicall(exactInput, refundETH) per SaucerSwap docs ───
  if (tokenIn.toUpperCase() === 'HBAR') {
    const payableHbar = Number(amountInWei) / 1e8;
    const routerInterface = new Interface(ROUTER_ABI);
    const exactInputEncoded = routerInterface.encodeFunctionData('exactInput', [
      {
        path: pathBytes,
        recipient: recipientHex,
        deadline,
        amountIn: amountInWei,
        amountOutMinimum,
      },
    ]);
    const refundETHEncoded = routerInterface.encodeFunctionData(
      'refundETH',
      [],
    );
    const multicallEncoded = routerInterface.encodeFunctionData('multicall', [
      [exactInputEncoded, refundETHEncoded],
    ]);
    const multicallBytes = getBytes(multicallEncoded);

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(routerId))
      .setGas(ROUTER_GAS)
      .setPayableAmount(new Hbar(payableHbar))
      .setFunctionParameters(multicallBytes);

    const result = await api.txExecution.signAndExecute(tx);
    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage:
          result.receipt?.status?.status?.toString() ?? 'Swap failed',
      };
    }
    const outputData: SwapExecuteOutput = {
      network,
      transactionId: result.transactionId ?? '',
      tokenIn: validArgs.in,
      tokenOut: validArgs.out,
      amountIn: validArgs.amount,
      // Report the minimum guaranteed output so the user isn't misled
      // by the optimistic pre-slippage quote value.
      amountOut: String(amountOutMinimum),
    };
    return { status: Status.Success, outputJson: JSON.stringify(outputData) };
  }

  // ── token → HBAR: approve then swap (exactInput, no multicall) ───────────────
  const routerInfo = await api.mirror.getContractInfo(routerId);
  const routerEvm = routerInfo.evm_address;
  if (!routerEvm) {
    return {
      status: Status.Failure,
      errorMessage: 'Router contract has no EVM address',
    };
  }

  const contractInfo = await api.identityResolution.resolveContract({
    contractReference: tokenIn,
    type: EntityReferenceType.ENTITY_ID,
    network,
  });

  const approveParams = new ContractFunctionParameters()
    .addAddress(routerEvm.startsWith('0x') ? routerEvm : `0x${routerEvm}`)
    .addUint256(toLong(amountInWei));

  const approveTx = api.contract.contractExecuteTransaction({
    contractId: contractInfo.contractId,
    gas: 100_000,
    functionName: 'approve',
    functionParameters: approveParams,
  });
  const approveResult = await api.txExecution.signAndExecute(
    approveTx.transaction,
  );
  if (!approveResult.success) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        'Approve failed',
        approveResult.receipt?.status,
      ),
    };
  }

  const exactInputParams = new ContractFunctionParameters()
    .addBytes(pathBytesUint8)
    .addAddress(recipientHex)
    .addUint256(deadline)
    .addUint256(toLong(amountInWei))
    .addUint256(toLong(amountOutMinimum));

  const swapTx = api.contract.contractExecuteTransaction({
    contractId: routerId,
    gas: ROUTER_GAS,
    functionName: 'exactInput',
    functionParameters: exactInputParams,
  });
  const swapResult = await api.txExecution.signAndExecute(swapTx.transaction);
  if (!swapResult.success) {
    return {
      status: Status.Failure,
      errorMessage:
        swapResult.receipt?.status?.status?.toString() ?? 'Swap failed',
    };
  }

  const outputData: SwapExecuteOutput = {
    network,
    transactionId: swapResult.transactionId ?? '',
    tokenIn: validArgs.in,
    tokenOut: validArgs.out,
    amountIn: validArgs.amount,
    amountOut: String(amountOutMinimum),
  };
  return { status: Status.Success, outputJson: JSON.stringify(outputData) };
}
