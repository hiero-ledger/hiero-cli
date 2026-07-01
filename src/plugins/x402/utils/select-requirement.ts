import type { PaymentRequirements } from '@x402/core/types';

import { SUPPORTED_HEDERA_NETWORKS } from '@x402/hedera';

import { ValidationError } from '@/core/errors';

export function selectHederaRequirement(
  accepts: PaymentRequirements[],
  asset?: string,
): PaymentRequirements {
  const hederaExact = accepts.filter(
    (r) =>
      r.scheme === 'exact' &&
      (SUPPORTED_HEDERA_NETWORKS as readonly string[]).includes(r.network),
  );

  const candidates = asset
    ? hederaExact.filter((r) => r.asset === asset)
    : hederaExact;

  if (candidates.length === 0) {
    throw new ValidationError(
      'No matching Hedera exact payment requirement in the challenge.',
      { context: { asset, availableAssets: hederaExact.map((r) => r.asset) } },
    );
  }

  if (candidates.length > 1) {
    throw new ValidationError(
      'Multiple Hedera payment requirements offered. Pass --asset to choose one.',
      { context: { availableAssets: candidates.map((r) => r.asset) } },
    );
  }

  return candidates[0];
}
