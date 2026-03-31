/**
 * Utilities for extracting public keys from mirror node topic keys.
 *
 * Mirror node returns admin_key/submit_key in two formats: simple (ED25519, ECDSA) or
 * ProtobufEncoded (KeyList/ThresholdKey). The SDK has no public API to parse these, so we
 * decode protobuf manually and use Key._fromProtobufKey to get SDK Key objects, then
 * extract raw public key strings for KMS lookup.
 */

import type { MirrorNodeKey } from '@/core/services/mirrornode/types';

import { Key, KeyList, PublicKey } from '@hashgraph/sdk';
import * as proto from '@hiero-ledger/proto';

import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';

export interface ExtractedKeysResult {
  publicKeys: string[];
  threshold: number;
}

const MIRROR_NODE_PROTOBUF_TYPE = 'ProtobufEncoded';

/** Returns raw hex string for PublicKey, null for KeyList/ContractId. */
function keyToRawPublicKey(key: Key): string | null {
  if (key instanceof PublicKey) {
    return key.toStringRaw();
  }
  return null;
}

/** Flattens KeyList (including nested) to raw public keys, preserves threshold when set. */
function extractFromKeyList(keyList: KeyList): ExtractedKeysResult {
  const keys = keyList.toArray();
  const publicKeys: string[] = [];
  for (const key of keys) {
    const raw = keyToRawPublicKey(key);
    if (raw) {
      publicKeys.push(raw);
    } else if (key instanceof KeyList) {
      const nested = extractFromKeyList(key);
      publicKeys.push(...nested.publicKeys);
    }
  }
  const threshold = keyList.threshold ?? 0;
  return { publicKeys, threshold };
}

/** Handles single PublicKey or KeyList. SDK has no getAllPublicKeys(), so we recurse manually. */
function extractFromKey(key: Key): ExtractedKeysResult {
  const raw = keyToRawPublicKey(key);
  if (raw) {
    return { publicKeys: [raw], threshold: 1 };
  }
  if (key instanceof KeyList) {
    return extractFromKeyList(key);
  }
  return { publicKeys: [], threshold: 0 };
}

/** Parses mirror node key (simple or ProtobufEncoded) into raw public keys for KMS matching. */
export function extractPublicKeysFromMirrorNodeKey(
  mirrorKey: MirrorNodeKey | undefined | null,
): ExtractedKeysResult {
  if (!mirrorKey?.key) {
    return { publicKeys: [], threshold: 0 };
  }

  const { _type, key } = mirrorKey;

  if (Object.values(MirrorNodeKeyType).includes(_type as MirrorNodeKeyType)) {
    try {
      const pk = PublicKey.fromString(key);
      return { publicKeys: [pk.toStringRaw()], threshold: 1 };
    } catch {
      return { publicKeys: [], threshold: 0 };
    }
  }

  if (_type === MIRROR_NODE_PROTOBUF_TYPE) {
    try {
      const hexKey = key.startsWith('0x') ? key.slice(2) : key;
      const bytes = Buffer.from(hexKey, 'hex');
      const decoded = proto.proto.Key.decode(bytes);
      const sdkKey = Key._fromProtobufKey(decoded);
      return extractFromKey(sdkKey);
    } catch {
      return { publicKeys: [], threshold: 0 };
    }
  }

  return { publicKeys: [], threshold: 0 };
}

/**
 * Derives how many distinct admin signatures are required on Hedera from mirror
 * key extraction (single key, threshold key list, or KeyList where all must sign).
 */
export function getEffectiveAdminKeyRequirement(
  extracted: ExtractedKeysResult,
): { adminPublicKeys: string[]; requiredSignatures: number } {
  const { publicKeys, threshold } = extracted;
  if (publicKeys.length === 0) {
    return { adminPublicKeys: [], requiredSignatures: 0 };
  }
  if (publicKeys.length === 1) {
    return { adminPublicKeys: publicKeys, requiredSignatures: 1 };
  }
  const requiredSignatures =
    threshold > 0 ? Math.min(threshold, publicKeys.length) : publicKeys.length;
  return { adminPublicKeys: publicKeys, requiredSignatures };
}
