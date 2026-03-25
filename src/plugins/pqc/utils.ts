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
export function calculateQRS(
  keys: KeyAuditResult[],
  hasAdminKey: boolean,
): number {
  if (keys.length === 0) return 0;

  // Key score: weighted average of vulnerability tiers (Tier 0=100, Tier 4=0)
  const keyScore =
    keys.reduce((sum, k) => {
      const tierScore = ((4 - k.vulnerabilityTier) / 4) * 100;
      return sum + tierScore;
    }, 0) / keys.length;

  // Algorithm diversity: penalise single-algorithm dependency
  const uniqueAlgorithms = new Set(keys.map((k) => k.algorithm));
  const algorithmDiversity =
    uniqueAlgorithms.size > 1
      ? Math.min(uniqueAlgorithms.size * 25, 100)
      : 10;

  // Rotation readiness: can keys be rotated when PQC is available?
  const rotationReadiness = hasAdminKey ? 80 : 0;

  // Compliance alignment: days until CNSA 2.0 deadline
  const now = new Date();
  const daysUntilDeadline = Math.max(
    0,
    (CNSA_2_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  // More days remaining = higher score (more time to prepare)
  const complianceAlignment = Math.min((daysUntilDeadline / 365) * 50, 100);

  const qrs = Math.round(
    keyScore * QRS_WEIGHTS.keyScore +
      algorithmDiversity * QRS_WEIGHTS.algorithmDiversity +
      rotationReadiness * QRS_WEIGHTS.rotationReadiness +
      complianceAlignment * QRS_WEIGHTS.complianceAlignment,
  );

  return Math.max(0, Math.min(100, qrs));
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
