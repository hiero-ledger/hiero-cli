/**
 * Unit tests for AccountServiceImpl
 * Tests account creation, info queries, and balance queries
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';

import '@/core/utils/json-serialize';

import { AccountId, Hbar, PublicKey } from '@hashgraph/sdk';

import { ECDSA_HEX_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { AccountServiceImpl } from '@/core/services/account/account-transaction-service';
import { KeyAlgorithm } from '@/core/shared/constants';

import {
  createMockAccountBalanceQuery,
  createMockAccountCreateTransaction,
  createMockAccountInfoQuery,
} from './mocks';

const mockTransaction = createMockAccountCreateTransaction();
const mockInfoQuery = createMockAccountInfoQuery();
const mockBalanceQuery = createMockAccountBalanceQuery();

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
  AccountBalanceQuery: jest.fn(() => mockBalanceQuery),
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
    it('should create account with ECDSA key type', () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
        keyType: KeyAlgorithm.ECDSA,
      };

      const result = accountService.createAccount(params);

      expect(Hbar.fromTinybars).toHaveBeenCalledWith('100000000');
      expect(PublicKey.fromString).toHaveBeenCalledWith(ECDSA_HEX_PUBLIC_KEY);
      expect(mockTransaction.setInitialBalance).toHaveBeenCalledWith(
        mockHbarInstance,
      );
      expect(mockTransaction.setECDSAKeyWithAlias).toHaveBeenCalledWith(
        mockPublicKeyInstance,
      );
      expect(mockTransaction.setKeyWithoutAlias).not.toHaveBeenCalled();
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

    it('should default to ECDSA when keyType is not specified', () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      };

      accountService.createAccount(params);

      expect(mockTransaction.setECDSAKeyWithAlias).toHaveBeenCalled();
      expect(mockTransaction.setKeyWithoutAlias).not.toHaveBeenCalled();
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

      expect(accountService.createAccount(params)).rejects.toThrow(
        expect.objectContaining({
          message: 'Invalid account creation parameters',
        }),
      );

      PublicKeyMock.fromString.mockReturnValue(mockPublicKeyInstance);
    });

    it('should throw ValidationError when Hbar.fromTinybars fails', async () => {
      const { Hbar: HbarMock } = jest.requireMock('@hashgraph/sdk');
      const sdkError = new Error('Invalid balance value');
      HbarMock.fromTinybars.mockImplementation(() => {
        throw sdkError;
      });

      const params = {
        balanceRaw: -100n,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      };

      await expect(accountService.createAccount(params)).rejects.toThrow(
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

    it('should throw ValidationError when AccountId.fromString fails', async () => {
      const { AccountId: AccountIdMock } = jest.requireMock('@hashgraph/sdk');
      const sdkError = new Error('Invalid account ID format');
      AccountIdMock.fromString.mockImplementation(() => {
        throw sdkError;
      });

      await expect(
        accountService.getAccountInfo('invalid-account-id'),
      ).rejects.toThrow(
        expect.objectContaining({
          message: 'Invalid account ID format',
        }),
      );

      AccountIdMock.fromString.mockReturnValue(mockAccountIdInstance);
    });
  });

  describe('getAccountBalance', () => {
    it('should create account balance query with correct account ID', () => {
      const accountId = '0.0.1234';

      const result = accountService.getAccountBalance(accountId);

      expect(AccountId.fromString).toHaveBeenCalledWith(accountId);
      expect(mockBalanceQuery.setAccountId).toHaveBeenCalledWith(
        mockAccountIdInstance,
      );
      expect(result).toBe(mockBalanceQuery);
    });

    it('should log debug messages when getting account balance', () => {
      const accountId = '0.0.9999';

      accountService.getAccountBalance(accountId);

      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Getting account balance for: 0.0.9999',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Created account balance query for: 0.0.9999',
      );
    });

    it('should log token ID note when token ID is provided', () => {
      const accountId = '0.0.1234';
      const tokenId = '0.0.5555';

      accountService.getAccountBalance(accountId, tokenId);

      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Getting account balance for: 0.0.1234, token: 0.0.5555',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Note: Token ID 0.0.5555 specified but AccountBalanceQuery returns all token balances',
      );
    });

    it('should not log token note when token ID is not provided', () => {
      const accountId = '0.0.1234';

      accountService.getAccountBalance(accountId);

      expect(logger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Token ID'),
      );
    });

    it('should throw ValidationError when AccountId.fromString fails', () => {
      const { AccountId: AccountIdMock } = jest.requireMock('@hashgraph/sdk');
      const sdkError = new Error('Invalid account ID format');
      AccountIdMock.fromString.mockImplementation(() => {
        throw sdkError;
      });

      expect(
        accountService.getAccountBalance('invalid-account-id'),
      ).rejects.toThrow(
        expect.objectContaining({
          message: 'Invalid account ID format',
        }),
      );

      AccountIdMock.fromString.mockReturnValue(mockAccountIdInstance);
    });

    it('should throw ValidationError with token context when provided', async () => {
      const { AccountId: AccountIdMock } = jest.requireMock('@hashgraph/sdk');
      const sdkError = new Error('Invalid account ID format');
      AccountIdMock.fromString.mockImplementation(() => {
        throw sdkError;
      });

      const accountId = 'invalid-account-id';
      const tokenId = '0.0.5555';

      await expect(
        accountService.getAccountBalance(accountId, tokenId),
      ).rejects.toThrow(ValidationError);

      AccountIdMock.fromString.mockReturnValue(mockAccountIdInstance);
    });
  });
});
