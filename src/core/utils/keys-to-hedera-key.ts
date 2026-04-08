import type { Key } from '@hashgraph/sdk';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

import { KeyList, PublicKey } from '@hashgraph/sdk';

export function toHederaKey(
  keys: ResolvedPublicKey[],
  threshold?: number,
): Key | undefined {
  if (keys.length === 0) return undefined;
  if (keys.length === 1) return PublicKey.fromString(keys[0].publicKey);
  const effectiveThreshold = threshold ?? keys.length;
  return new KeyList(
    keys.map((k) => PublicKey.fromString(k.publicKey)),
    effectiveThreshold,
  );
}
