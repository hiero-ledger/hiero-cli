/**
 * Unit tests for AccountServiceImpl
 * Tests account creation, info queries, and balance queries
 */
import '../../../../utils/json-serialize';
import { KeyAlgorithm } from '../../../../shared/constants';
import { makeLogger } from '../../../../../__tests__/mocks/mocks';
import type { Logger } from '../../../logger/logger-service.interface';
import {
  createMockAccountCreateTransaction,
  createMockAccountInfoQuery,
  createMockAccountBalanceQuery,
} from './mocks';
import { AccountServiceImpl } from '../../account-transaction-service';
import { AccountId, PublicKey, Hbar } from '@hashgraph/sdk';

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
    const TEST_PUBLIC_KEY =
      '026e876ad28d7d8f79013ed83272b9bc89162d657f6cd912ef047e651407144c1c';

    it('should create account with ECDSA key type', async () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: TEST_PUBLIC_KEY,
        keyType: KeyAlgorithm.ECDSA,
      };

      const result = await accountService.createAccount(params);

      expect(Hbar.fromTinybars).toHaveBeenCalledWith(100_000_000n);
      expect(PublicKey.fromString).toHaveBeenCalledWith(TEST_PUBLIC_KEY);
      expect(mockTransaction.setInitialBalance).toHaveBeenCalledWith(
        mockHbarInstance,
      );
      expect(mockTransaction.setECDSAKeyWithAlias).toHaveBeenCalledWith(
        mockPublicKeyInstance,
      );
      expect(mockTransaction.setKeyWithoutAlias).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTransaction);
      expect(result.publicKey).toBe(TEST_PUBLIC_KEY);
    });

    it('should create account with ED25519 key type', async () => {
      const params = {
        balanceRaw: 50_000_000n,
        publicKey: TEST_PUBLIC_KEY,
        keyType: KeyAlgorithm.ED25519,
      };

      const result = await accountService.createAccount(params);

      expect(mockTransaction.setKeyWithoutAlias).toHaveBeenCalledWith(
        mockPublicKeyInstance,
      );
      expect(mockTransaction.setECDSAKeyWithAlias).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTransaction);
      expect(result.publicKey).toBe(TEST_PUBLIC_KEY);
    });

    it('should default to ECDSA when keyType is not specified', async () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: TEST_PUBLIC_KEY,
      };

      await accountService.createAccount(params);

      expect(mockTransaction.setECDSAKeyWithAlias).toHaveBeenCalled();
      expect(mockTransaction.setKeyWithoutAlias).not.toHaveBeenCalled();
    });

    it('should set max auto associations when specified', async () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: TEST_PUBLIC_KEY,
        maxAutoAssociations: 10,
      };

      await accountService.createAccount(params);

      expect(
        mockTransaction.setMaxAutomaticTokenAssociations,
      ).toHaveBeenCalledWith(10);
    });

    it('should not set max auto associations when not specified', async () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: TEST_PUBLIC_KEY,
      };

      await accountService.createAccount(params);

      expect(
        mockTransaction.setMaxAutomaticTokenAssociations,
      ).not.toHaveBeenCalled();
    });

    it('should not set max auto associations when value is 0', async () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: TEST_PUBLIC_KEY,
        maxAutoAssociations: 0,
      };

      await accountService.createAccount(params);

      expect(
        mockTransaction.setMaxAutomaticTokenAssociations,
      ).not.toHaveBeenCalled();
    });

    it('should log debug messages during account creation', async () => {
      const params = {
        balanceRaw: 100_000_000n,
        publicKey: TEST_PUBLIC_KEY,
      };

      await accountService.createAccount(params);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[ACCOUNT TX] Creating account with params:'),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ACCOUNT TX] Created transaction for account with key:',
        ),
      );
    });

    it('should handle zero balance by using 0 as fallback', async () => {
      const { Hbar: HbarMock } = jest.requireMock('@hashgraph/sdk');
      HbarMock.fromTinybars.mockReturnValueOnce(null);

      const params = {
        balanceRaw: 0n,
        publicKey: TEST_PUBLIC_KEY,
      };

      await accountService.createAccount(params);

      expect(mockTransaction.setInitialBalance).toHaveBeenCalledWith(0);
    });
  });

  describe('getAccountInfo', () => {
    it('should create account info query with correct account ID', async () => {
      const accountId = '0.0.1234';

      const result = await accountService.getAccountInfo(accountId);

      expect(AccountId.fromString).toHaveBeenCalledWith(accountId);
      expect(mockInfoQuery.setAccountId).toHaveBeenCalledWith(
        mockAccountIdInstance,
      );
      expect(result).toBe(mockInfoQuery);
    });

    it('should log debug messages when getting account info', async () => {
      const accountId = '0.0.5678';

      await accountService.getAccountInfo(accountId);

      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Getting account info for: 0.0.5678',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Created account info query for: 0.0.5678',
      );
    });
  });

  describe('getAccountBalance', () => {
    it('should create account balance query with correct account ID', async () => {
      const accountId = '0.0.1234';

      const result = await accountService.getAccountBalance(accountId);

      expect(AccountId.fromString).toHaveBeenCalledWith(accountId);
      expect(mockBalanceQuery.setAccountId).toHaveBeenCalledWith(
        mockAccountIdInstance,
      );
      expect(result).toBe(mockBalanceQuery);
    });

    it('should log debug messages when getting account balance', async () => {
      const accountId = '0.0.9999';

      await accountService.getAccountBalance(accountId);

      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Getting account balance for: 0.0.9999',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Created account balance query for: 0.0.9999',
      );
    });

    it('should log token ID note when token ID is provided', async () => {
      const accountId = '0.0.1234';
      const tokenId = '0.0.5555';

      await accountService.getAccountBalance(accountId, tokenId);

      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Getting account balance for: 0.0.1234, token: 0.0.5555',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[ACCOUNT TX] Note: Token ID 0.0.5555 specified but AccountBalanceQuery returns all token balances',
      );
    });

    it('should not log token note when token ID is not provided', async () => {
      const accountId = '0.0.1234';

      await accountService.getAccountBalance(accountId);

      expect(logger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Token ID'),
      );
    });
  });
});
