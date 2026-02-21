/**
 * Encode SaucerSwap V2 path: [tokenIn (20 bytes), fee (3 bytes), tokenOut (20 bytes)].
 * Fee is uint24 e.g. 500 for 0.05%.
 */
import { ContractId } from '@hashgraph/sdk';
import { getBytes, hexlify } from 'ethers';

const FEE_BYTES = 3;
const ADDR_BYTES = 20;
const PATH_BYTES = ADDR_BYTES + FEE_BYTES + ADDR_BYTES;

function entityIdToEvmAddressBytes(entityId: string): Uint8Array {
  const solidity = ContractId.fromString(entityId).toSolidityAddress();
  const hex = solidity.startsWith('0x') ? solidity : `0x${solidity}`;
  return getBytes(hex);
}

function feeToBytes(fee: number): Uint8Array {
  const buf = new Uint8Array(FEE_BYTES);
  buf[2] = fee & 0xff;
  buf[1] = (fee >> 8) & 0xff;
  buf[0] = (fee >> 16) & 0xff;
  return buf;
}

/**
 * Build path bytes for a single-hop swap: tokenIn -> fee -> tokenOut.
 * tokenInId / tokenOutId: Hedera entity ID (0.0.x) or "HBAR" for WHBAR.
 */
export function encodePath(
  tokenInId: string,
  tokenOutId: string,
  feeTier: number,
  whbarTokenId: string,
): Uint8Array {
  const inAddr =
    tokenInId.toUpperCase() === 'HBAR'
      ? entityIdToEvmAddressBytes(whbarTokenId)
      : entityIdToEvmAddressBytes(tokenInId);
  const outAddr =
    tokenOutId.toUpperCase() === 'HBAR'
      ? entityIdToEvmAddressBytes(whbarTokenId)
      : entityIdToEvmAddressBytes(tokenOutId);
  const fee = feeToBytes(feeTier);
  const path = new Uint8Array(PATH_BYTES);
  path.set(inAddr, 0);
  path.set(fee, ADDR_BYTES);
  path.set(outAddr, ADDR_BYTES + FEE_BYTES);
  return path;
}

/** Same as encodePath but returns hex string for ethers encodeFunctionData. */
export function encodePathHex(
  tokenInId: string,
  tokenOutId: string,
  feeTier: number,
  whbarTokenId: string,
): string {
  return hexlify(encodePath(tokenInId, tokenOutId, feeTier, whbarTokenId));
}
