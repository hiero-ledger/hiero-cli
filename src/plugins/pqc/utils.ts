/**
 * PQC Plugin Utilities
 * Quantum readiness scoring and key analysis helpers
 */

import {
  ALGORITHM_VULNERABILITY,
  CNSA_2_DEADLINE,
  QRS_WEIGHTS,
  VULNERABILITY_LABELS,
  VulnerabilityTier,
} from './types';
import type { KeyAuditResult } from './types';

/**
 * Classify a key algorithm's quantum vulnerability.
 */
export function classifyAlgorithm(algorithm: string): {
  tier: VulnerabilityTier;
  label: string;
} {
  const normalised = algorithm.toUpperCase().replace(/-/g, '_');
  const tier =
    ALGORITHM_VULNERABILITY[normalised] ?? VulnerabilityTier.CRITICAL;
  return { tier, label: VULNERABILITY_LABELS[tier] };
}

/**
 * Detect the algorithm type from a Hedera Key object.
 * Hedera SDK keys expose _key (ED25519) or have ECDSA markers.
 */
export function detectKeyAlgorithm(keyBytes: Uint8Array): string {
  // ED25519 public keys are 32 bytes
  if (keyBytes.length === 32) return 'ED25519';
  // ECDSA-secp256k1 compressed public keys are 33 bytes
  if (keyBytes.length === 33) return 'ECDSA_SECP256K1';
  // ECDSA uncompressed public keys are 65 bytes
  if (keyBytes.length === 65) return 'ECDSA_SECP256K1';
  return 'UNKNOWN';
}

/**
 * Calculate the Quantum Readiness Score (QRS) for a set of keys.
 *
 * QRS = (key_score * 0.40) + (algo_diversity * 0.20) +
 *        (rotation_readiness * 0.20) + (compliance_alignment * 0.20)
 */
/**
 * Calculate the total QRS score (convenience wrapper).
 */
export function calculateQRS(
  keys: KeyAuditResult[],
  hasAdminKey: boolean,
): number {
  return calculateQRSWithBreakdown(keys, hasAdminKey).total;
}

/**
 * QRS breakdown components returned alongside the total score.
 */
export interface QRSBreakdown {
  keyScore: number;
  algorithmDiversity: number;
  rotationReadiness: number;
  complianceAlignment: number;
  total: number;
}

/**
 * Calculate QRS with detailed breakdown for the score command.
 */
export function calculateQRSWithBreakdown(
  keys: KeyAuditResult[],
  hasAdminKey: boolean,
): QRSBreakdown {
  if (keys.length === 0) {
    return {
      keyScore: 0,
      algorithmDiversity: 0,
      rotationReadiness: 0,
      complianceAlignment: 0,
      total: 0,
    };
  }

  const keyScore =
    keys.reduce((sum, k) => {
      const tierScore = ((4 - k.vulnerabilityTier) / 4) * 100;
      return sum + tierScore;
    }, 0) / keys.length;

  const uniqueAlgorithms = new Set(keys.map((k) => k.algorithm));
  const algorithmDiversity =
    uniqueAlgorithms.size > 1
      ? Math.min(uniqueAlgorithms.size * 25, 100)
      : 10;

  const rotationReadiness = hasAdminKey ? 80 : 0;

  const now = new Date();
  const daysUntilDeadline = Math.max(
    0,
    (CNSA_2_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const complianceAlignment = Math.min((daysUntilDeadline / 365) * 50, 100);

  const total = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        keyScore * QRS_WEIGHTS.keyScore +
          algorithmDiversity * QRS_WEIGHTS.algorithmDiversity +
          rotationReadiness * QRS_WEIGHTS.rotationReadiness +
          complianceAlignment * QRS_WEIGHTS.complianceAlignment,
      ),
    ),
  );

  return {
    keyScore: Math.round(keyScore),
    algorithmDiversity: Math.round(algorithmDiversity),
    rotationReadiness: Math.round(rotationReadiness),
    complianceAlignment: Math.round(complianceAlignment),
    total,
  };
}

/**
 * Analyse a Hedera Key object and return audit results.
 * Handles ED25519, ECDSA, KeyList, and ThresholdKey structures.
 *
 * NOTE: KeyList detection uses the internal `_keys` property from
 * @hashgraph/sdk 2.80.0. If the SDK changes its internal structure,
 * this will fall through to the UNKNOWN branch safely.
 */
export function analyseKey(
  keyType: string,
  keyData: unknown,
  hasAdminKey: boolean,
): KeyAuditResult[] {
  const results: KeyAuditResult[] = [];

  if (!keyData) return results;

  const key = keyData as Record<string, unknown>;

  if (typeof key.toBytes === 'function') {
    const bytes = (key as { toBytes: () => Uint8Array }).toBytes();
    const algorithm = detectKeyAlgorithm(bytes);
    const { tier, label } = classifyAlgorithm(algorithm);

    results.push({
      keyType,
      algorithm,
      vulnerabilityTier: tier,
      vulnerabilityLabel: label,
      canRotate: hasAdminKey,
    });
  } else if (key._keys && Array.isArray(key._keys)) {
    // KeyList or ThresholdKey (@hashgraph/sdk 2.80.0 internal property)
    for (const subKey of key._keys) {
      results.push(
        ...analyseKey(`${keyType} (multi-sig)`, subKey, hasAdminKey),
      );
    }
  } else {
    results.push({
      keyType,
      algorithm: 'UNKNOWN',
      vulnerabilityTier: VulnerabilityTier.CRITICAL,
      vulnerabilityLabel: VULNERABILITY_LABELS[VulnerabilityTier.CRITICAL],
      canRotate: hasAdminKey,
    });
  }

  return results;
}

/**
 * Generate human-readable recommendations based on audit results.
 */
export function generateRecommendations(
  keys: KeyAuditResult[],
  hasAdminKey: boolean,
): string[] {
  const recommendations: string[] = [];

  const criticalKeys = keys.filter(
    (k) => k.vulnerabilityTier === VulnerabilityTier.CRITICAL,
  );
  if (criticalKeys.length > 0) {
    const types = [...new Set(criticalKeys.map((k) => k.keyType))].join(', ');
    recommendations.push(
      `${criticalKeys.length} key(s) use quantum-vulnerable algorithms (${types}). Plan migration to ML-DSA-65 when Hiero supports PQC key types.`,
    );
  }

  if (!hasAdminKey) {
    recommendations.push(
      'Account has no admin key — key rotation is NOT possible. This account cannot be migrated to PQC algorithms. Consider creating a new account with an admin key.',
    );
  } else {
    recommendations.push(
      'Account has admin key — key rotation is possible when PQC key types are supported.',
    );
  }

  const allCritical = keys.every(
    (k) => k.vulnerabilityTier === VulnerabilityTier.CRITICAL,
  );
  if (allCritical) {
    recommendations.push(
      'All keys are quantum-vulnerable. Monitor NIST FIPS 203/204 adoption in Hiero SDK for migration timeline.',
    );
  }

  return recommendations;
}
