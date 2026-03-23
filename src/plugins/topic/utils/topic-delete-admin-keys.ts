import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { KmsService } from '@/core/services/kms/kms-service.interface';

import { ValidationError } from '@/core/errors';

function normalizePk(pk: string): string {
  return pk.toLowerCase();
}

export function buildAdminPublicKeySet(adminPublicKeys: string[]): Set<string> {
  return new Set(adminPublicKeys.map((p) => normalizePk(p)));
}

export interface ResolveExplicitAdminKeysResult {
  signingKeyRefIds: string[];
  ignoredKeyRefIds: string[];
}

export function resolveSigningKeyRefsFromExplicitCredentials(
  resolved: ResolvedPublicKey[],
  adminPublicKeysSet: Set<string>,
  requiredSignatures: number,
): ResolveExplicitAdminKeysResult {
  const signingKeyRefIds: string[] = [];
  const ignoredKeyRefIds: string[] = [];
  const seenPublicKeys = new Set<string>();

  for (const r of resolved) {
    const pk = normalizePk(r.publicKey);
    if (!adminPublicKeysSet.has(pk)) {
      ignoredKeyRefIds.push(r.keyRefId);
      continue;
    }
    if (!seenPublicKeys.has(pk)) {
      seenPublicKeys.add(pk);
      signingKeyRefIds.push(r.keyRefId);
    }
  }

  if (signingKeyRefIds.length < requiredSignatures) {
    throw new ValidationError(
      `Topic requires ${requiredSignatures} admin signature(s) on Hedera, but the matching --admin-key credential(s) are insufficient.`,
    );
  }

  return { signingKeyRefIds, ignoredKeyRefIds };
}

export function resolveSigningKeyRefsFromState(
  adminKeyRefIds: string[],
  kms: KmsService,
  adminPublicKeysSet: Set<string>,
  requiredSignatures: number,
): string[] {
  const matchedRefIds: string[] = [];
  const seenPublicKeys = new Set<string>();

  for (const refId of adminKeyRefIds) {
    const rec = kms.get(refId);
    if (!rec?.publicKey) {
      continue;
    }
    const pk = normalizePk(rec.publicKey);
    if (adminPublicKeysSet.has(pk) && !seenPublicKeys.has(pk)) {
      seenPublicKeys.add(pk);
      matchedRefIds.push(refId);
    }
  }

  if (matchedRefIds.length < requiredSignatures) {
    throw new ValidationError(
      `Topic requires ${requiredSignatures} admin signature(s) on Hedera, but local state only has ${matchedRefIds.length} matching key(s). Pass --admin-key with additional admin credentials (see topic create key format).`,
    );
  }

  return matchedRefIds;
}
