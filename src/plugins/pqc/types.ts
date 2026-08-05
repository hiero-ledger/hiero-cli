/**
 * PQC Plugin Types
 * Quantum vulnerability classification and scoring types
 */

/**
 * Vulnerability tier classification for cryptographic algorithms.
 * Based on NIST SP 800-131A Rev 3 and CNSA 2.0 guidance.
 */
export enum VulnerabilityTier {
  PQC_READY = 0,
  STRONG = 1,
  MODERATE = 2,
  WEAK = 3,
  CRITICAL = 4,
}

export const VULNERABILITY_LABELS: Record<VulnerabilityTier, string> = {
  [VulnerabilityTier.PQC_READY]: 'PQC_READY',
  [VulnerabilityTier.STRONG]: 'STRONG',
  [VulnerabilityTier.MODERATE]: 'MODERATE',
  [VulnerabilityTier.WEAK]: 'WEAK',
  [VulnerabilityTier.CRITICAL]: 'CRITICAL',
};

/**
 * Maps Hedera/Hiero key algorithms to their quantum vulnerability tier.
 */
export const ALGORITHM_VULNERABILITY: Record<string, VulnerabilityTier> = {
  ED25519: VulnerabilityTier.CRITICAL,
  ECDSA_SECP256K1: VulnerabilityTier.CRITICAL,
  RSA: VulnerabilityTier.CRITICAL,
  // Future PQC algorithms (not yet supported by Hiero)
  ML_DSA_65: VulnerabilityTier.PQC_READY,
  ML_KEM_768: VulnerabilityTier.PQC_READY,
  SLH_DSA: VulnerabilityTier.PQC_READY,
};

/**
 * QRS scoring weights
 */
export const QRS_WEIGHTS = {
  keyScore: 0.4,
  algorithmDiversity: 0.2,
  rotationReadiness: 0.2,
  complianceAlignment: 0.2,
} as const;

/**
 * CNSA 2.0 deadline for PQC adoption
 */
export const CNSA_2_DEADLINE = new Date('2027-01-01T00:00:00Z');

export interface KeyAuditResult {
  keyType: string;
  algorithm: string;
  vulnerabilityTier: VulnerabilityTier;
  vulnerabilityLabel: string;
  canRotate: boolean;
}

export interface AuditResult {
  entityId: string;
  entityType: 'account' | 'topic' | 'token';
  network: string;
  auditTimestamp: string;
  keys: KeyAuditResult[];
  quantumReadinessScore: number;
  recommendations: string[];
  complianceFlags: {
    cnsa2_2027: boolean;
    nist_fips_203: boolean;
    nist_fips_204: boolean;
  };
}
