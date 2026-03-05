/**
 * Unit tests for AccountServiceImpl
 * Tests account creation, info queries, and balance queries
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';

import '@/core/utils/json-serialize';

import { AccountId, Hbar, PublicKey } from '@hashgraph/sdk';

import { ECDSA_HEX_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { KeyAlgorithm } from '@/core';
import { ValidationError } from '@/core/errors';
import { AccountServiceImpl } from '@/core/services/account/account-transaction-service';

import {
  createMockAccountCreateTransaction,
  createMockAccountInfoQuery,
} from './mocks';

const mockTransaction = createMockAccountCreateTransaction();
const mockInfoQuery = createMockAccountInfoQuery();

const mockPublicKeyInstance = {
  toString: jest.fn().mockReturnValue('mock-pk'),
};
const mockAccountIdInstance = {
  toString: jest.fn().mockReturnValue('0.0.1234'),
};
const mockHbarInstance = { toString: jest.fn().mockReturnValue('100 ℏ') };

jest.mock('@hashgraph/sdk', () => ({
  AccountCreateTransaction: jest.fn(() => mockTransaction),
  AccountInfoQuery: jest.fn(() => mockInfoQuery),
  AccountId: {
    fromString: jest.fn(() => mockAccountIdInstance),
  },
  PublicKey: {
    fromString: jest.fn(() => mockPublicKeyInstance),
  },
  Hbar: {
    fromTinybars: jest.fn(() => mockHbarInstance),
  },
  TokenType: {
    NonFungibleUnique: 'NON_FUNGIBLE_UNIQUE',
    FungibleCommon: 'FUNGIBLE_COMMON',
  },
}));

describe('AccountServiceImpl', () => {
  let accountService: AccountServiceImpl;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    accountService = new AccountServiceImpl(logger);
  });

  describe('createAccount', () => {
    it('should create account with provided public key', () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      };

      const result = accountService.createAccount(params);

      expect(Hbar.fromTinybars).toHaveBeenCalledWith('100000000');
      expect(PublicKey.fromString).toHaveBeenCalledWith(ECDSA_HEX_PUBLIC_KEY);
      expect(mockTransaction.setInitialBalance).toHaveBeenCalledWith(
        mockHbarInstance,
      );
      expect(mockTransaction.setKeyWithoutAlias).toHaveBeenCalledWith(
        mockPublicKeyInstance,
      );
      expect(mockTransaction.setECDSAKeyWithAlias).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTransaction);
      expect(result.publicKey).toBe(ECDSA_HEX_PUBLIC_KEY);
    });

    it('should create account with ED25519 key type', () => {
      const params = {
        balanceRaw: 50_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
        keyType: KeyAlgorithm.ED25519,
      };

      const result = accountService.createAccount(params);

      expect(mockTransaction.setKeyWithoutAlias).toHaveBeenCalledWith(
        mockPublicKeyInstance,
      );
      expect(mockTransaction.setECDSAKeyWithAlias).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTransaction);
      expect(result.publicKey).toBe(ECDSA_HEX_PUBLIC_KEY);
    });

    it('should always use setKeyWithoutAlias regardless of key format', () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      };

      accountService.createAccount(params);

      expect(mockTransaction.setKeyWithoutAlias).toHaveBeenCalled();
      expect(mockTransaction.setECDSAKeyWithAlias).not.toHaveBeenCalled();
    });

    it('should set max auto associations when specified', () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
        maxAutoAssociations: 10,
      };

      accountService.createAccount(params);

      expect(
        mockTransaction.setMaxAutomaticTokenAssociations,
      ).toHaveBeenCalledWith(10);
    });

    it('should not set max auto associations when not specified', () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      };

      accountService.createAccount(params);

      expect(
        mockTransaction.setMaxAutomaticTokenAssociations,
      ).not.toHaveBeenCalled();
    });

    it('should not set max auto associations when value is 0', () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
        maxAutoAssociations: 0,
      };

      accountService.createAccount(params);

      expect(
        mockTransaction.setMaxAutomaticTokenAssociations,
      ).not.toHaveBeenCalled();
    });

    it('should log debug messages during account creation', () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      };

      accountService.createAccount(params);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[ACCOUNT TX] Creating account with params:'),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ACCOUNT TX] Created transaction for account with key:',
        ),
      );
    });

    it('should handle zero balance by using 0 as fallback', () => {
      const { Hbar: HbarMock } = jest.requireMock('@hashgraph/sdk');
      HbarMock.fromTinybars.mockReturnValueOnce(null);

      const params = {
        balanceRaw: 0n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      };

      accountService.createAccount(params);

      expect(mockTransaction.setInitialBalance).toHaveBeenCalledWith(0);
    });

    it('should throw ValidationError when PublicKey.fromString fails', () => {
      const { PublicKey: PublicKeyMock } = jest.requireMock('@hashgraph/sdk');
      const sdkError = new Error('Invalid public key format');
      PublicKeyMock.fromString.mockImplementation(() => {
        throw sdkError;
      });

      const params = {
        balanceRaw: 100_000_000n,
        publicKey: 'invalid-key',
      };

      expect(() => accountService.createAccount(params)).toThrow(
        expect.objectContaining({
          message: 'Invalid account creation parameters',
        }),
      );

      PublicKeyMock.fromString.mockReturnValue(mockPublicKeyInstance);
    });

    it('should throw ValidationError when Hbar.fromTinybars fails', () => {
      const { Hbar: HbarMock } = jest.requireMock('@hashgraph/sdk');
      const sdkError = new Error('Invalid balance value');
      HbarMock.fromTinybars.mockImplementation(() => {
        throw sdkError;
      });

      const params = {
        balanceRaw: -100n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      };

      expect(() => accountService.createAccount(params)).toThrow(
        ValidationError,
      );

      HbarMock.fromTinybars.mockReturnValue(mockHbarInstance);
    });
  });

  describe('getAccountInfo', () => {
    it('should create account info query with correct account ID', () => {
      const accountId = '0.0.1234';

      const result = accountService.getAccountInfo(accountId);

      expect(AccountId.fromString).toHaveBeenCalledWith(accountId);
      expect(mockInfoQuery.setAccountId).toHaveBeenCalledWith(
        mockAccountIdInstance,
      );
      expect(result).toBe(mockInfoQuery);
    });

    it('should log debug messages when getting account info', () => {
      const accountId = '0.0.5678';

      accountService.getAccountInfo(accountId);

      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Getting account info for: 0.0.5678',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Created account info query for: 0.0.5678',
      );
    });

    it('should throw ValidationError when AccountId.fromString fails', () => {
      const { AccountId: AccountIdMock } = jest.requireMock('@hashgraph/sdk');
      const sdkError = new Error('Invalid account ID format');
      AccountIdMock.fromString.mockImplementation(() => {
        throw sdkError;
      });

      expect(() => accountService.getAccountInfo('invalid-account-id')).toThrow(
        expect.objectContaining({
          message: 'Invalid account ID format',
        }),
      );

      AccountIdMock.fromString.mockReturnValue(mockAccountIdInstance);
    });
  });
});
