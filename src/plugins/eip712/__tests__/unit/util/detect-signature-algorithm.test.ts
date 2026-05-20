import {
  isEcdsaSignature,
  isEd25519Signature,
} from '@/plugins/eip712/util/detect-signature-algorithm';

const ECDSA_SIG = '0x' + 'a'.repeat(130); // 65 bytes
const ED25519_SIG = '0x' + 'a'.repeat(128); // 64 bytes

describe('isEcdsaSignature', () => {
  it('returns true for a 0x-prefixed 65-byte hex string', () => {
    expect(isEcdsaSignature(ECDSA_SIG)).toBe(true);
  });

  it('returns false for a 64-byte hex string', () => {
    expect(isEcdsaSignature(ED25519_SIG)).toBe(false);
  });

  it('returns false for a string without 0x prefix', () => {
    expect(isEcdsaSignature('a'.repeat(130))).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isEcdsaSignature('')).toBe(false);
  });

  it('returns false for non-hex characters', () => {
    expect(isEcdsaSignature('0x' + 'g'.repeat(130))).toBe(false);
  });
});

describe('isEd25519Signature', () => {
  it('returns true for a 0x-prefixed 64-byte hex string', () => {
    expect(isEd25519Signature(ED25519_SIG)).toBe(true);
  });

  it('returns false for a 65-byte hex string', () => {
    expect(isEd25519Signature(ECDSA_SIG)).toBe(false);
  });

  it('returns false for a string without 0x prefix', () => {
    expect(isEd25519Signature('a'.repeat(128))).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isEd25519Signature('')).toBe(false);
  });

  it('returns false for non-hex characters', () => {
    expect(isEd25519Signature('0x' + 'g'.repeat(128))).toBe(false);
  });
});
