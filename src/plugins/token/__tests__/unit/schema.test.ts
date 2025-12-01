/**
 * Token Schema Validation Tests
 * Tests the token data validation and schema functionality
 */
import {
  TokenDataSchema,
  TokenKeysSchema,
  TokenAssociationSchema,
  CustomFeeSchema,
  safeValidateTokenCreateParams,
  validateTokenData,
} from '../../schema';
import {
  validTokenDataForSchema,
  validTokenKeys,
  validTokenAssociation,
  validCustomFee,
  validTokenCreateParams,
  minimalTokenCreateParams,
  validTokenDataForValidation,
  invalidTokenDataForValidation,
} from './helpers/fixtures';

describe('Token Schema Validation', () => {
  describe('TokenDataSchema', () => {
    test('should validate valid token data', () => {
      const result = TokenDataSchema.safeParse(validTokenDataForSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validTokenDataForSchema);
      }
    });

    test('should reject invalid token ID format', () => {
      const invalidData = {
        ...validTokenDataForSchema,
        tokenId: 'invalid-id',
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Token ID must be in format 0.0.123456',
        );
      }
    });

    test('should reject empty token name', () => {
      const invalidData = {
        ...validTokenDataForSchema,
        name: '',
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Token name is required',
        );
      }
    });

    test('should reject empty token symbol', () => {
      const invalidData = {
        ...validTokenDataForSchema,
        symbol: '',
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Token symbol is required',
        );
      }
    });

    test('should reject negative decimals', () => {
      const invalidData = {
        ...validTokenDataForSchema,
        decimals: -1,
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Decimals must be non-negative',
        );
      }
    });

    test('should accept decimals up to 18', () => {
      const validData = {
        ...validTokenDataForSchema,
        decimals: 18,
      };

      const result = TokenDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should reject negative initial supply', () => {
      const invalidData = {
        ...validTokenDataForSchema,
        initialSupply: -100,
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Initial supply must be non-negative',
        );
      }
    });

    test('should reject invalid supply type', () => {
      const invalidData = {
        ...validTokenDataForSchema,
        supplyType: 'INVALID',
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Supply type must be either FINITE or INFINITE',
        );
      }
    });

    test('should reject invalid treasury ID format', () => {
      const invalidData = {
        ...validTokenDataForSchema,
        treasuryId: 'invalid-treasury-id',
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Treasury ID must be in format 0.0.123456',
        );
      }
    });

    test('should reject invalid network', () => {
      const invalidData = {
        ...validTokenDataForSchema,
        network: 'invalid-network',
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Network must be mainnet, testnet, previewnet, or localnet',
        );
      }
    });
  });

  describe('TokenKeysSchema', () => {
    test('should validate valid token keys', () => {
      const result = TokenKeysSchema.safeParse(validTokenKeys);
      expect(result.success).toBe(true);
    });

    test('should reject empty admin key', () => {
      const invalidKeys = {
        ...validTokenKeys,
        adminKey: '',
      };

      const result = TokenKeysSchema.safeParse(invalidKeys);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Admin key is required',
        );
      }
    });

    test('should reject empty treasury key', () => {
      const invalidKeys = {
        ...validTokenKeys,
        treasuryKey: '',
      };

      const result = TokenKeysSchema.safeParse(invalidKeys);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Treasury key is required',
        );
      }
    });

    test('should allow optional keys to be empty', () => {
      const keysWithEmptyOptional = {
        ...validTokenKeys,
        supplyKey: '',
        wipeKey: '',
        kycKey: '',
        freezeKey: '',
        pauseKey: '',
        feeScheduleKey: '',
      };

      const result = TokenKeysSchema.safeParse(keysWithEmptyOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('TokenAssociationSchema', () => {
    test('should validate valid association', () => {
      const result = TokenAssociationSchema.safeParse(validTokenAssociation);
      expect(result.success).toBe(true);
    });

    test('should reject empty association name', () => {
      const invalidAssociation = {
        ...validTokenAssociation,
        name: '',
      };

      const result = TokenAssociationSchema.safeParse(invalidAssociation);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Association name is required',
        );
      }
    });

    test('should reject invalid account ID format', () => {
      const invalidAssociation = {
        ...validTokenAssociation,
        accountId: 'invalid-account-id',
      };

      const result = TokenAssociationSchema.safeParse(invalidAssociation);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Account ID must be in format 0.0.123456',
        );
      }
    });
  });

  describe('CustomFeeSchema', () => {
    test('should validate valid custom fee', () => {
      const result = CustomFeeSchema.safeParse(validCustomFee);
      expect(result.success).toBe(true);
    });

    test('should accept any fee type (no validation)', () => {
      const invalidFee = {
        ...validCustomFee,
        type: 'invalid-type',
      };

      const result = CustomFeeSchema.safeParse(invalidFee);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('invalid-type');
      }
    });

    test('should accept negative amount (no validation)', () => {
      const invalidFee = {
        ...validCustomFee,
        amount: -10,
      };

      const result = CustomFeeSchema.safeParse(invalidFee);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(-10);
      }
    });

    test('should accept any collector ID format (no validation)', () => {
      const invalidFee = {
        ...validCustomFee,
        collectorId: 'invalid-collector-id',
      };

      const result = CustomFeeSchema.safeParse(invalidFee);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collectorId).toBe('invalid-collector-id');
      }
    });
  });

  describe('safeValidateTokenCreateParams', () => {
    test('should validate valid create parameters', () => {
      const result = safeValidateTokenCreateParams(validTokenCreateParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validTokenCreateParams);
      }
    });

    test('should handle missing optional parameters', () => {
      const result = safeValidateTokenCreateParams(minimalTokenCreateParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.decimals).toBeUndefined();
        expect(result.data.initialSupply).toBeUndefined();
        expect(result.data.supplyType).toBeUndefined();
      }
    });

    test('should reject invalid create parameters', () => {
      const invalidParams = {
        tokenName: '', // Invalid: empty name
        symbol: 'TEST',
      };

      const result = safeValidateTokenCreateParams(invalidParams);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
        expect(result.error.errors[0].message).toContain(
          'Token name is required',
        );
      }
    });
  });

  describe('validateTokenData', () => {
    test('should validate and return true for valid token data', () => {
      const result = validateTokenData(validTokenDataForValidation);
      expect(result).toBe(true);
    });

    test('should return false for invalid token data', () => {
      const result = validateTokenData(invalidTokenDataForValidation);
      expect(result).toBe(false);
    });
  });

  describe('edge cases and boundary values', () => {
    test('should handle maximum valid decimals', () => {
      const validData = {
        tokenId: '0.0.123456',
        name: 'TestToken',
        symbol: 'TEST',
        decimals: 18, // Maximum allowed
        initialSupply: 1000,
        supplyType: 'FINITE',
        maxSupply: 10000,
        treasuryId: '0.0.789012',
        associations: [],
        keys: {
          adminKey: 'admin-key',
          treasuryKey: 'treasury-key',
        },
        network: 'testnet',
        customFees: [],
      };

      const result = TokenDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should handle zero initial supply', () => {
      const validData = {
        tokenId: '0.0.123456',
        name: 'TestToken',
        symbol: 'TEST',
        decimals: 0,
        initialSupply: 0, // Zero is valid
        supplyType: 'INFINITE',
        maxSupply: 0,
        treasuryId: '0.0.789012',
        associations: [],
        keys: {
          adminKey: 'admin-key',
          treasuryKey: 'treasury-key',
        },
        network: 'testnet',
        customFees: [],
      };

      const result = TokenDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should handle very long token names', () => {
      const longName = 'A'.repeat(100); // Maximum allowed length
      const validData = {
        tokenId: '0.0.123456',
        name: longName,
        symbol: 'TEST',
        decimals: 0,
        initialSupply: 1000,
        supplyType: 'FINITE',
        maxSupply: 10000,
        treasuryId: '0.0.789012',
        associations: [],
        keys: {
          adminKey: 'admin-key',
          treasuryKey: 'treasury-key',
        },
        network: 'testnet',
        customFees: [],
      };

      const result = TokenDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should reject token names longer than 100 characters', () => {
      const tooLongName = 'A'.repeat(101); // Over maximum allowed length
      const invalidData = {
        tokenId: '0.0.123456',
        name: tooLongName,
        symbol: 'TEST',
        decimals: 0,
        initialSupply: 1000,
        supplyType: 'FINITE',
        maxSupply: 10000,
        treasuryId: '0.0.789012',
        associations: [],
        keys: {
          adminKey: 'admin-key',
          treasuryKey: 'treasury-key',
        },
        network: 'testnet',
        customFees: [],
      };

      const result = TokenDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Token name must be 100 characters or less',
        );
      }
    });
  });
});
