import {
  ECDSA_DER_PRIVATE_KEY,
  ECDSA_HEX_PRIVATE_KEY_WITH_0X,
  ED25519_DER_PRIVATE_KEY,
  ED25519_HEX_PRIVATE_KEY_WITH_0X,
} from '__tests__/mocks/fixtures';

import { KeyAlgorithm } from '@/core/shared/constants';
import { parseKeyWithType } from '@/core/utils/keys';

describe('parseKeyWithType', () => {
  const validEcdsaHexKey = ECDSA_HEX_PRIVATE_KEY_WITH_0X;
  const validEcdsaDerKey = ECDSA_DER_PRIVATE_KEY;
  const validEd25519HexKey = ED25519_HEX_PRIVATE_KEY_WITH_0X;
  const validEd25519DerKey = ED25519_DER_PRIVATE_KEY;

  test('parses key without prefix and defaults to ecdsa', () => {
    const result = parseKeyWithType(validEcdsaHexKey);
    expect(result.keyType).toBe(KeyAlgorithm.ECDSA);
    expect(result.privateKey).toBe(validEcdsaHexKey);
  });

  test('parses key with ecdsa prefix', () => {
    const result = parseKeyWithType(`ecdsa:${validEcdsaHexKey}`);
    expect(result.keyType).toBe(KeyAlgorithm.ECDSA);
    expect(result.privateKey).toBe(validEcdsaHexKey);
  });

  test('parses key with ECDSA prefix (uppercase)', () => {
    const result = parseKeyWithType(`ECDSA:${validEcdsaHexKey}`);
    expect(result.keyType).toBe(KeyAlgorithm.ECDSA);
    expect(result.privateKey).toBe(validEcdsaHexKey);
  });

  test('parses key with ed25519 prefix', () => {
    const result = parseKeyWithType(`ed25519:${validEd25519HexKey}`);
    expect(result.keyType).toBe(KeyAlgorithm.ED25519);
    expect(result.privateKey).toBe(validEd25519HexKey);
  });

  test('parses key with ED25519 prefix (uppercase)', () => {
    const result = parseKeyWithType(`ED25519:${validEd25519HexKey}`);
    expect(result.keyType).toBe(KeyAlgorithm.ED25519);
    expect(result.privateKey).toBe(validEd25519HexKey);
  });

  test('parses key with mixed case prefix', () => {
    const result = parseKeyWithType(`Ed25519:${validEd25519HexKey}`);
    expect(result.keyType).toBe(KeyAlgorithm.ED25519);
    expect(result.privateKey).toBe(validEd25519HexKey);
  });

  test('parses key with 0x prefix', () => {
    const result = parseKeyWithType(`${validEcdsaHexKey}`);
    expect(result.keyType).toBe(KeyAlgorithm.ECDSA);
    expect(result.privateKey).toBe(`${validEcdsaHexKey}`);
  });

  test('parses ed25519 key with 0x prefix', () => {
    const result = parseKeyWithType(`ed25519:${validEd25519HexKey}`);
    expect(result.keyType).toBe(KeyAlgorithm.ED25519);
    expect(result.privateKey).toBe(`${validEd25519HexKey}`);
  });

  test('parses DER format key', () => {
    const result = parseKeyWithType(validEcdsaDerKey);
    expect(result.keyType).toBe(KeyAlgorithm.ECDSA);
    expect(result.privateKey).toBe(validEcdsaDerKey);
  });

  test('parses DER format key with ed25519 prefix', () => {
    const result = parseKeyWithType(`ed25519:${validEd25519DerKey}`);
    expect(result.keyType).toBe(KeyAlgorithm.ED25519);
    expect(result.privateKey).toBe(validEd25519DerKey);
  });

  test('throws error for empty key string', () => {
    expect(() => parseKeyWithType('')).toThrow('Private key cannot be empty');
  });

  test('throws error for key with only prefix', () => {
    expect(() => parseKeyWithType('ecdsa:')).toThrow(
      "Private key cannot be empty. Key type prefix 'ecdsa' provided but no key follows.",
    );
    expect(() => parseKeyWithType('ed25519:')).toThrow(
      "Private key cannot be empty. Key type prefix 'ed25519' provided but no key follows.",
    );
  });
});
