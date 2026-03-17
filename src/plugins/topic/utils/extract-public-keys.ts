/**
 * Utilities for extracting public keys from mirror node topic keys and matching them with KMS.
 *
 * Mirror node returns admin_key/submit_key in two formats: simple (ED25519, ECDSA) or
 * ProtobufEncoded (KeyList/ThresholdKey). The SDK has no public API to parse these, so we
 * decode protobuf manually and use Key._fromProtobufKey to get SDK Key objects, then
 * extract raw public key strings for KMS lookup (findByPublicKey).
 */

import { Key, KeyList, PublicKey } from '@hashgraph/sdk';
import * as proto from '@hiero-ledger/proto';

export interface ExtractedKeysResult {
  publicKeys: string[];
  threshold?: number;
}

const MIRROR_NODE_SIMPLE_KEY_TYPES = ['ED25519', 'ECDSA_SECP256K1'] as const;
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
  const threshold = keyList.threshold ?? undefined;
  return { publicKeys, threshold };
}

/** Handles single PublicKey or KeyList. SDK has no getAllPublicKeys(), so we recurse manually. */
function extractFromKey(key: Key): ExtractedKeysResult {
  const raw = keyToRawPublicKey(key);
  if (raw) {
    return { publicKeys: [raw] };
  }
  if (key instanceof KeyList) {
    return extractFromKeyList(key);
  }
  return { publicKeys: [] };
}

/** Parses mirror node key (simple or ProtobufEncoded) into raw public keys for KMS matching. */
export function extractPublicKeysFromMirrorNodeKey(
  mirrorKey: { _type: string; key: string } | undefined,
): ExtractedKeysResult | undefined {
  if (!mirrorKey?.key) {
    return undefined;
  }

  const { _type, key } = mirrorKey;

  if (
    MIRROR_NODE_SIMPLE_KEY_TYPES.includes(
      _type as (typeof MIRROR_NODE_SIMPLE_KEY_TYPES)[number],
    )
  ) {
    try {
      const pk = PublicKey.fromString(key);
      return { publicKeys: [pk.toStringRaw()] };
    } catch {
      return undefined;
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
      return undefined;
    }
  }

  return undefined;
}

/** Maps public keys to KMS keyRefIds via findByPublicKey; skips keys not found in KMS. */
export function matchKeysWithKms(
  publicKeys: string[],
  kms: {
    findByPublicKey: (publicKey: string) => { keyRefId: string } | undefined;
  },
): string[] {
  const keyRefIds: string[] = [];
  for (const publicKey of publicKeys) {
    const record = kms.findByPublicKey(publicKey);
    if (record) {
      keyRefIds.push(record.keyRefId);
    }
  }
  return keyRefIds;
}
