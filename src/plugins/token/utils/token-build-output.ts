import type {
  MirrorNodeKey,
  NftInfo,
  TokenInfo,
} from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { KeyInfo, TokenViewOutput } from '@/plugins/token/commands/view';

import { SupplyType } from '@/core/types/shared.types';
import { extractPublicKeysFromMirrorNodeKey } from '@/core/utils/extract-public-keys';

/**
 * Decode base64 metadata to UTF-8 string
 * Returns undefined if metadata is missing or cannot be decoded
 */
function decodeMetadata(base64?: string): string | undefined {
  if (!base64) return undefined;
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    // If decoding fails, return the original (malformed base64)
    return base64;
  }
}

/**
 * Format Hedera timestamp to readable date string
 * Supports both formats:
 * - Hedera format: "1768898341.551352532" (seconds.nanoseconds)
 * - ISO format: "2024-01-01T12:00:00.000Z"
 * Output: "2026-01-20 12:45:41"
 */
function formatHederaTimestamp(timestamp?: string): string | undefined {
  if (!timestamp) return undefined;

  let date: Date;

  // Check if ISO format (contains 'T')
  if (timestamp.includes('T')) {
    date = new Date(timestamp);
  } else {
    // Hedera format (seconds.nanoseconds)
    const timestampAsSeconds = timestamp.split('.')[0];
    const milliseconds = Number(timestampAsSeconds) * 1000;
    date = new Date(milliseconds);
  }

  // Format: YYYY-MM-DD HH:mm:ss
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/** Converts Mirror Node `expiry_timestamp` (nanoseconds since epoch) to ISO 8601. */
function expiryTimestampToIso(expiry?: number | null): string | undefined {
  if (!expiry || !Number.isFinite(expiry) || expiry === 0) return undefined;
  return new Date(expiry / 1e6).toISOString();
}

/**
 * Extract and resolve a MirrorNode key into KeyInfo for display.
 * Returns null when no key is present.
 * Returns { keys, threshold } where threshold is only set for multi-key (KeyList/ThresholdKey).
 */
function buildKeyInfo(
  mirrorKey: MirrorNodeKey | undefined | null,
): KeyInfo | null {
  const { publicKeys, threshold } =
    extractPublicKeysFromMirrorNodeKey(mirrorKey);
  if (publicKeys.length === 0) return null;
  if (publicKeys.length === 1) return { keys: publicKeys };
  return {
    keys: publicKeys,
    threshold: threshold > 0 ? threshold : publicKeys.length,
  };
}

/**
 * Build output object based on token type and mode
 */
export function tokenBuildOutput(
  tokenInfo: TokenInfo,
  nftInfo: NftInfo | null,
  network: SupportedNetwork,
): TokenViewOutput {
  // Determine supply type based on max_supply
  // If max_supply is "0", it's INFINITE, otherwise FINITE
  const supplyType: SupplyType =
    tokenInfo.max_supply === '0' ? SupplyType.INFINITE : SupplyType.FINITE;

  const base = {
    tokenId: tokenInfo.token_id,
    name: tokenInfo.name,
    symbol: tokenInfo.symbol,
    type: tokenInfo.type,
    network,
    totalSupply: tokenInfo.total_supply,
    maxSupply: tokenInfo.max_supply,
    supplyType,
    treasury: tokenInfo.treasury_account_id || undefined,
    memo: tokenInfo.memo || undefined,
    createdTimestamp: formatHederaTimestamp(tokenInfo.created_timestamp),
    adminKey: buildKeyInfo(tokenInfo.admin_key),
    supplyKey: buildKeyInfo(tokenInfo.supply_key),
    freezeDefault: tokenInfo.freeze_default ?? false,
    autoRenewPeriodSeconds: tokenInfo.auto_renew_period,
    autoRenewAccountId: tokenInfo.auto_renew_account || undefined,
    expirationTime: expiryTimestampToIso(tokenInfo.expiry_timestamp),
  };

  // Add decimals only for Fungible Tokens
  if (tokenInfo.type === 'FUNGIBLE_COMMON') {
    return {
      ...base,
      decimals: parseInt(tokenInfo.decimals, 10),
    };
  }

  // NFT with specific serial number
  if (nftInfo) {
    return {
      ...base,
      nftSerial: {
        serialNumber: nftInfo.serial_number,
        owner: nftInfo.account_id,
        metadata: decodeMetadata(nftInfo.metadata),
        metadataRaw: nftInfo.metadata,
        createdTimestamp: formatHederaTimestamp(nftInfo.created_timestamp),
        deleted: nftInfo.deleted,
      },
    };
  }

  // NFT collection without specific serial
  return base;
}
