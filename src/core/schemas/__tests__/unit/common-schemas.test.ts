import {
  ED25519_DER_PRIVATE_KEY,
  ED25519_HEX_PRIVATE_KEY,
  ED25519_HEX_PRIVATE_KEY_WITH_0X,
} from '@/__tests__/mocks/fixtures';
import {
  SHORT_DER_KEY,
  SHORT_ECDSA_DER_KEY,
  SHORT_KEY,
  TEST_ACCOUNT_ID,
} from '@/core/schemas/__tests__/helpers/fixtures';
import { AccountIdWithPrivateKeySchema } from '@/core/schemas/common-schemas';
import { INVALID_KEY } from '@/core/services/topic/__tests__/unit/mocks';

describe('AccountIdWithPrivateKeySchema', () => {
  const accountId = TEST_ACCOUNT_ID;
  const derKey = ED25519_DER_PRIVATE_KEY;
  const hexKey = ED25519_HEX_PRIVATE_KEY;
  const hexKeyWith0x = ED25519_HEX_PRIVATE_KEY_WITH_0X;

  describe('valid formats', () => {
    test('validates DER format key and returns parsed object', () => {
      const input = `${accountId}:${derKey}`;
      const result = AccountIdWithPrivateKeySchema.parse(input);
      expect(result).toEqual({
        accountId,
        privateKey: derKey,
      });
    });

    test('validates short DER format key (100 chars)', () => {
      const input = `${accountId}:${SHORT_ECDSA_DER_KEY}`;
      const result = AccountIdWithPrivateKeySchema.parse(input);
      expect(result).toEqual({
        accountId,
        privateKey: SHORT_ECDSA_DER_KEY,
      });
    });

    test('validates hex format key', () => {
      const input = `${accountId}:${hexKey}`;
      const result = AccountIdWithPrivateKeySchema.parse(input);
      expect(result).toEqual({
        accountId,
        privateKey: hexKey,
      });
    });

    test('validates 0x hex format key', () => {
      const input = `${accountId}:${hexKeyWith0x}`;
      const result = AccountIdWithPrivateKeySchema.parse(input);
      expect(result).toEqual({
        accountId,
        privateKey: hexKeyWith0x,
      });
    });
  });

  describe('rejects keyType prefix', () => {
    test('rejects ed25519 prefix', () => {
      const input = `${accountId}:ed25519:${hexKey}`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });

    test('rejects ecdsa prefix', () => {
      const input = `${accountId}:ecdsa:${hexKey}`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });
  });

  describe('invalid formats', () => {
    test('rejects account ID starting with 0', () => {
      const input = `0.0.0:${hexKey}`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });

    test('rejects invalid account ID format', () => {
      const input = `123.456.789:${hexKey}`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });

    test('rejects key that is too short (hex)', () => {
      const input = `${accountId}:${SHORT_KEY}`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });

    test('rejects DER key that is too short', () => {
      const input = `${accountId}:${SHORT_DER_KEY}`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });

    test('rejects key with invalid hex characters', () => {
      const input = `${accountId}:${INVALID_KEY}`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });

    test('rejects missing key part', () => {
      const input = `${accountId}:`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });

    test('rejects missing account ID', () => {
      const input = `:${hexKey}`;
      expect(() => AccountIdWithPrivateKeySchema.parse(input)).toThrow();
      expect(AccountIdWithPrivateKeySchema.safeParse(input).success).toBe(
        false,
      );
    });
  });
});
