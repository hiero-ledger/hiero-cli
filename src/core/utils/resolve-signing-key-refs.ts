import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

import { ValidationError } from '@/core/errors';

function normalizePk(pk: string): string {
  return pk.toLowerCase();
}

export function buildPublicKeySet(publicKeys: string[]): Set<string> {
  return new Set(publicKeys.map((p) => normalizePk(p)));
}

export interface ResolveExplicitSigningKeysResult {
  signingKeyRefIds: string[];
  ignoredKeyRefIds: string[];
}

export function resolveSigningKeyRefsFromExplicitCredentials(
  resolved: ResolvedPublicKey[],
  allowedPublicKeysSet: Set<string>,
  requiredSignatures: number,
): ResolveExplicitSigningKeysResult {
  const signingKeyRefIds: string[] = [];
  const ignoredKeyRefIds: string[] = [];
  const seenPublicKeys = new Set<string>();

  for (const resolvedKey of resolved) {
    const pk = normalizePk(resolvedKey.publicKey);
    if (!allowedPublicKeysSet.has(pk)) {
      ignoredKeyRefIds.push(resolvedKey.keyRefId);
      continue;
    }
    if (!seenPublicKeys.has(pk)) {
      seenPublicKeys.add(pk);
      signingKeyRefIds.push(resolvedKey.keyRefId);
    }
  }

  if (signingKeyRefIds.length < requiredSignatures) {
    throw new ValidationError(
      `Required ${requiredSignatures} signature(s), but only ${signingKeyRefIds.length} matching credential(s) were provided.`,
    );
  }

  return { signingKeyRefIds, ignoredKeyRefIds };
}
