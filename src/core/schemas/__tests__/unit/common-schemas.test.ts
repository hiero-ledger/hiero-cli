import { AccountIdKeyPairSchema } from '../../common-schemas';
import {
  TEST_ACCOUNT_ID,
  SHORT_KEY,
  SHORT_DER_KEY,
  SHORT_ECDSA_DER_KEY,
} from '../helpers/fixtures';
import {
  ED25519_DER_PRIVATE_KEY,
  ED25519_HEX_PRIVATE_KEY,
  ED25519_HEX_PRIVATE_KEY_WITH_0X,
} from '../../../../__tests__/mocks/fixtures';

describe('AccountIdKeyPairSchema', () => {
  const accountId = TEST_ACCOUNT_ID;
  const derKey = ED25519_DER_PRIVATE_KEY;
  const hexKey = ED25519_HEX_PRIVATE_KEY;
  const hexKeyWith0x = ED25519_HEX_PRIVATE_KEY_WITH_0X;

  describe('no prefix (default)', () => {
    test('validates DER format key', () => {
      const input = `${accountId}:${derKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates short DER format key (100 chars)', () => {
      const input = `${accountId}:${SHORT_ECDSA_DER_KEY}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates hex format key', () => {
      const input = `${accountId}:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates 0x hex format key', () => {
      const input = `${accountId}:${hexKeyWith0x}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('ed25519 prefix', () => {
    test('validates DER format key', () => {
      const input = `${accountId}:ed25519:${derKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates hex format key', () => {
      const input = `${accountId}:ed25519:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates 0x hex format key', () => {
      const input = `${accountId}:ed25519:${hexKeyWith0x}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates uppercase ED25519 prefix', () => {
      const input = `${accountId}:ED25519:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates mixed case Ed25519 prefix', () => {
      const input = `${accountId}:Ed25519:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('ecdsa prefix', () => {
    test('validates DER format key', () => {
      const input = `${accountId}:ecdsa:${derKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates hex format key', () => {
      const input = `${accountId}:ecdsa:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates 0x hex format key', () => {
      const input = `${accountId}:ecdsa:${hexKeyWith0x}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates uppercase ECDSA prefix', () => {
      const input = `${accountId}:ECDSA:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });

    test('validates mixed case Ecdsa prefix', () => {
      const input = `${accountId}:Ecdsa:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).not.toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('invalid formats', () => {
    test('rejects account ID starting with 0', () => {
      const input = `0.0.0:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(false);
    });

    test('rejects invalid account ID format', () => {
      const input = `123.456.789:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(false);
    });

    test('rejects key that is too short (hex)', () => {
      const input = `${accountId}:${SHORT_KEY}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(false);
    });

    test('rejects DER key that is too short', () => {
      const input = `${accountId}:${SHORT_DER_KEY}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(false);
    });

    test('rejects invalid key type prefix', () => {
      const input = `${accountId}:rsa:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(false);
    });

    test('rejects key with invalid hex characters', () => {
      const input = `${accountId}:${hexKey}zxca`;
      expect(() => AccountIdKeyPairSchema.parse(input)).toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(false);
    });

    test('rejects missing key part', () => {
      const input = `${accountId}:`;
      expect(() => AccountIdKeyPairSchema.parse(input)).toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(false);
    });

    test('rejects missing account ID', () => {
      const input = `:${hexKey}`;
      expect(() => AccountIdKeyPairSchema.parse(input)).toThrow();
      expect(AccountIdKeyPairSchema.safeParse(input).success).toBe(false);
    });
  });
});
