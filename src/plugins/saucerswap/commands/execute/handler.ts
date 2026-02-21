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
} from '@hashgraph/sdk';

import { Interface } from 'ethers';

import { EntityReferenceType } from '@/core/types/shared.types';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import {
  DEFAULT_POOL_FEE_TIER,
  getQuoterId,
  getRouterId,
  getWhbarTokenId,
  QUOTER_ABI,
} from '@/plugins/saucerswap/constants';
import {
  encodePath,
  encodePathHex,
} from '@/plugins/saucerswap/utils/path-encoding';

import { SwapExecuteInputSchema } from './input';

const ROUTER_GAS = 400_000;

/** Hedera SDK addUint256 expects number | Long | BigNumber; bigint is not in the type def but works at runtime. */
function toUint256Param(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < 0n) {
    return Number(value); // may lose precision for very large values
  }
  return Number(value);
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

  const slippagePercent = parseFloat(validArgs.slippage ?? '0.5');
  const slippageMultiplier = 1 - slippagePercent / 100;

  const pathHex = encodePathHex(
    inForPath,
    outForPath,
    DEFAULT_POOL_FEE_TIER,
    whbarTokenId,
  );
  const pathBytes = pathHex.startsWith('0x') ? pathHex : `0x${pathHex}`;

  const abiInterface = new Interface(QUOTER_ABI);
  let amountOutWei: bigint;
  try {
    const quoteResult = await api.contractQuery.queryContractFunction({
      abiInterface,
      contractIdOrEvmAddress: quoterId,
      functionName: 'quoteExactInput',
      args: [pathBytes, amountInWei],
    });
    amountOutWei = BigInt(String(quoteResult.queryResult[0]));
  } catch (e) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Quote failed (check pair/liquidity)', e),
    };
  }

  const amountOutMinimum = BigInt(
    Math.floor(Number(amountOutWei) * slippageMultiplier),
  );

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

  const pathBytesUint8 = encodePath(
    inForPath,
    outForPath,
    DEFAULT_POOL_FEE_TIER,
    whbarTokenId,
  );

  const functionParams = new ContractFunctionParameters()
    .addBytes(pathBytesUint8)
    .addAddress(recipientHex)
    .addUint256(deadline)
    .addUint256(toUint256Param(amountInWei))
    .addUint256(toUint256Param(amountOutMinimum));

  if (tokenIn.toUpperCase() === 'HBAR') {
    const payableHbar = Number(amountInWei) / 1e8;
    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(routerId))
      .setGas(ROUTER_GAS)
      .setPayableAmount(new Hbar(payableHbar))
      .setFunction('exactInput', functionParams);

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
      amountOut: String(amountOutWei),
    };
    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  }

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
    .addUint256(toUint256Param(amountInWei));

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

  const swapTx = api.contract.contractExecuteTransaction({
    contractId: routerId,
    gas: ROUTER_GAS,
    functionName: 'exactInput',
    functionParameters: functionParams,
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
    amountOut: String(amountOutWei),
  };
  return {
    status: Status.Success,
    outputJson: JSON.stringify(outputData),
  };
}
