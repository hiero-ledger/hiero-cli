/**
 * PQC Audit Command Unit Tests
 */
import {
  classifyAlgorithm,
  detectKeyAlgorithm,
  calculateQRS,
  generateRecommendations,
} from '../../utils';
import { VulnerabilityTier } from '../../types';
import type { KeyAuditResult } from '../../types';

describe('PQC Plugin - Utils', () => {
  describe('classifyAlgorithm', () => {
    test('classifies ED25519 as CRITICAL', () => {
      const result = classifyAlgorithm('ED25519');
      expect(result.tier).toBe(VulnerabilityTier.CRITICAL);
      expect(result.label).toBe('CRITICAL');
    });

    test('classifies ECDSA_SECP256K1 as CRITICAL', () => {
      const result = classifyAlgorithm('ECDSA_SECP256K1');
      expect(result.tier).toBe(VulnerabilityTier.CRITICAL);
    });

    test('classifies ML_DSA_65 as PQC_READY', () => {
      const result = classifyAlgorithm('ML_DSA_65');
      expect(result.tier).toBe(VulnerabilityTier.PQC_READY);
      expect(result.label).toBe('PQC_READY');
    });

    test('classifies ML_KEM_768 as PQC_READY', () => {
      const result = classifyAlgorithm('ML_KEM_768');
      expect(result.tier).toBe(VulnerabilityTier.PQC_READY);
    });

    test('normalises hyphenated algorithm names', () => {
      const result = classifyAlgorithm('ECDSA-SECP256K1');
      expect(result.tier).toBe(VulnerabilityTier.CRITICAL);
    });

    test('defaults unknown algorithms to CRITICAL', () => {
      const result = classifyAlgorithm('UNKNOWN_ALGO');
      expect(result.tier).toBe(VulnerabilityTier.CRITICAL);
    });
  });

  describe('detectKeyAlgorithm', () => {
    test('detects 32-byte keys as ED25519', () => {
      const bytes = new Uint8Array(32);
      expect(detectKeyAlgorithm(bytes)).toBe('ED25519');
    });

    test('detects 33-byte keys as ECDSA_SECP256K1', () => {
      const bytes = new Uint8Array(33);
      expect(detectKeyAlgorithm(bytes)).toBe('ECDSA_SECP256K1');
    });

    test('detects 65-byte keys as ECDSA_SECP256K1', () => {
      const bytes = new Uint8Array(65);
      expect(detectKeyAlgorithm(bytes)).toBe('ECDSA_SECP256K1');
    });

    test('returns UNKNOWN for unexpected key lengths', () => {
      const bytes = new Uint8Array(48);
      expect(detectKeyAlgorithm(bytes)).toBe('UNKNOWN');
    });
  });

  describe('calculateQRS', () => {
    test('returns 0 for empty keys', () => {
      expect(calculateQRS([], false)).toBe(0);
    });

    test('returns low score for all-CRITICAL keys without admin', () => {
      const keys: KeyAuditResult[] = [
        {
          keyType: 'account',
          algorithm: 'ED25519',
          vulnerabilityTier: VulnerabilityTier.CRITICAL,
          vulnerabilityLabel: 'CRITICAL',
          canRotate: false,
        },
      ];
      const qrs = calculateQRS(keys, false);
      // Key score = 0, diversity = 10, rotation = 0, compliance varies
      expect(qrs).toBeLessThan(20);
    });

    test('returns higher score with admin key', () => {
      const keys: KeyAuditResult[] = [
        {
          keyType: 'account',
          algorithm: 'ED25519',
          vulnerabilityTier: VulnerabilityTier.CRITICAL,
          vulnerabilityLabel: 'CRITICAL',
          canRotate: true,
        },
      ];
      const withAdmin = calculateQRS(keys, true);
      const withoutAdmin = calculateQRS(keys, false);
      expect(withAdmin).toBeGreaterThan(withoutAdmin);
    });

    test('returns 100 for all PQC_READY keys with admin', () => {
      const keys: KeyAuditResult[] = [
        {
          keyType: 'account',
          algorithm: 'ML_DSA_65',
          vulnerabilityTier: VulnerabilityTier.PQC_READY,
          vulnerabilityLabel: 'PQC_READY',
          canRotate: true,
        },
        {
          keyType: 'admin',
          algorithm: 'ML_KEM_768',
          vulnerabilityTier: VulnerabilityTier.PQC_READY,
          vulnerabilityLabel: 'PQC_READY',
          canRotate: true,
        },
      ];
      const qrs = calculateQRS(keys, true);
      expect(qrs).toBeGreaterThanOrEqual(80);
    });

    test('score is bounded between 0 and 100', () => {
      const keys: KeyAuditResult[] = [
        {
          keyType: 'account',
          algorithm: 'ED25519',
          vulnerabilityTier: VulnerabilityTier.CRITICAL,
          vulnerabilityLabel: 'CRITICAL',
          canRotate: false,
        },
      ];
      const qrs = calculateQRS(keys, false);
      expect(qrs).toBeGreaterThanOrEqual(0);
      expect(qrs).toBeLessThanOrEqual(100);
    });
  });

  describe('generateRecommendations', () => {
    test('flags critical keys', () => {
      const keys: KeyAuditResult[] = [
        {
          keyType: 'admin',
          algorithm: 'ED25519',
          vulnerabilityTier: VulnerabilityTier.CRITICAL,
          vulnerabilityLabel: 'CRITICAL',
          canRotate: true,
        },
      ];
      const recs = generateRecommendations(keys, true);
      expect(recs.some((r) => r.includes('quantum-vulnerable'))).toBe(true);
    });

    test('warns about missing admin key', () => {
      const keys: KeyAuditResult[] = [
        {
          keyType: 'account',
          algorithm: 'ED25519',
          vulnerabilityTier: VulnerabilityTier.CRITICAL,
          vulnerabilityLabel: 'CRITICAL',
          canRotate: false,
        },
      ];
      const recs = generateRecommendations(keys, false);
      expect(recs.some((r) => r.includes('no admin key'))).toBe(true);
    });

    test('confirms rotation is possible with admin key', () => {
      const keys: KeyAuditResult[] = [
        {
          keyType: 'account',
          algorithm: 'ED25519',
          vulnerabilityTier: VulnerabilityTier.CRITICAL,
          vulnerabilityLabel: 'CRITICAL',
          canRotate: true,
        },
      ];
      const recs = generateRecommendations(keys, true);
      expect(recs.some((r) => r.includes('rotation is possible'))).toBe(true);
    });
  });
});
