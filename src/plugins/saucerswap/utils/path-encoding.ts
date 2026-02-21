/**
 * Encode SaucerSwap V2 path: [tokenIn (20 bytes), fee (3 bytes), tokenOut (20 bytes)].
 * Fee is uint24 e.g. 500 for 0.05%.
 * All addresses use ContractId.toSolidityAddress() (shard.realm.num → 20 bytes).
 * WHBAR uses its proxy contract ID so the pool is found.
 */
import { ContractId } from '@hashgraph/sdk';
import { getBytes, hexlify } from 'ethers';

const FEE_BYTES = 3;
const ADDR_BYTES = 20;
const PATH_BYTES = ADDR_BYTES + FEE_BYTES + ADDR_BYTES;

function entityIdToEvmAddressBytes(entityId: string): Uint8Array {
  const solidity = ContractId.fromString(entityId).toSolidityAddress();
  const hex = solidity.startsWith('0x') ? solidity : `0x${solidity}`;
  const bytes = getBytes(hex);
  if (bytes.length !== ADDR_BYTES) {
    throw new Error(
      `Path address must be ${ADDR_BYTES} bytes, got ${bytes.length} for ${entityId}`,
    );
  }
  return bytes;
}

function feeToBytes(fee: number): Uint8Array {
  const buf = new Uint8Array(FEE_BYTES);
  buf[2] = fee & 0xff;
  buf[1] = (fee >> 8) & 0xff;
  buf[0] = (fee >> 16) & 0xff;
  return buf;
}

/**
 * Resolve the entity ID to use for the 20-byte address in the path.
 * Pools use the token's proxy contract address; for WHBAR, token ID and contract ID differ.
 * whbarPathEntityId: when token is HBAR or WHBAR token id, use this (contract id) in the path.
 */
function pathEntityId(
  tokenId: string,
  whbarTokenId: string,
  whbarPathEntityId: string,
): string {
  if (tokenId.toUpperCase() === 'HBAR' || tokenId === whbarTokenId) {
    return whbarPathEntityId;
  }
  return tokenId;
}

/**
 * Build path bytes for a single-hop swap: tokenIn -> fee -> tokenOut.
 * tokenInId / tokenOutId: Hedera entity ID (0.0.x) or "HBAR" for WHBAR.
 * whbarPathEntityId: entity ID to use in path for WHBAR (use token's proxy contract ID so pool is found).
 */
export function encodePath(
  tokenInId: string,
  tokenOutId: string,
  feeTier: number,
  whbarTokenId: string,
  whbarPathEntityId?: string,
): Uint8Array {
  const whbarForPath = whbarPathEntityId ?? whbarTokenId;
  const inResolved = pathEntityId(tokenInId, whbarTokenId, whbarForPath);
  const outResolved = pathEntityId(tokenOutId, whbarTokenId, whbarForPath);
  const inAddr = entityIdToEvmAddressBytes(inResolved);
  const outAddr = entityIdToEvmAddressBytes(outResolved);
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
  whbarPathEntityId?: string,
): string {
  return hexlify(
    encodePath(tokenInId, tokenOutId, feeTier, whbarTokenId, whbarPathEntityId),
  );
}
