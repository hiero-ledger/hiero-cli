/**
 * Unit tests for HbarServiceImpl
 * Tests HBAR transfer transaction creation
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { HbarServiceImpl } from '@/core/services/hbar/hbar-service';

const ACCOUNT_ID_FROM_1 = '0.0.1111';
const ACCOUNT_ID_TO_1 = '0.0.2222';
const ACCOUNT_ID_FROM_2 = '0.0.5555';
const ACCOUNT_ID_TO_2 = '0.0.9999';

const mockTransferTransaction = {
  addHbarTransfer: jest.fn().mockReturnThis(),
  setTransactionMemo: jest.fn().mockReturnThis(),
};

jest.mock('@hashgraph/sdk', () => ({
  TransferTransaction: jest.fn(() => mockTransferTransaction),
  AccountId: {
    fromString: jest.fn(),
  },
  Hbar: jest.fn(),
  HbarUnit: {
    Tinybar: 'tinybar',
  },
  TokenType: {
    NonFungibleUnique: 'NON_FUNGIBLE_UNIQUE',
    FungibleCommon: 'FUNGIBLE_COMMON',
  },
}));

import { AccountId, Hbar, HbarUnit } from '@hashgraph/sdk';

describe('HbarServiceImpl', () => {
  let hbarService: HbarServiceImpl;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    hbarService = new HbarServiceImpl(logger);
  });

  describe('transferTinybar', () => {
    it('should create transfer transaction with correct parameters', async () => {
      const params = {
        amount: 100_000_000n,
        from: ACCOUNT_ID_FROM_1,
        to: ACCOUNT_ID_TO_1,
      };

      const result = await hbarService.transferTinybar(params);

      expect(AccountId.fromString).toHaveBeenCalledWith(ACCOUNT_ID_FROM_1);
      expect(AccountId.fromString).toHaveBeenCalledWith(ACCOUNT_ID_TO_1);
      expect(Hbar).toHaveBeenCalledWith('-100000000', HbarUnit.Tinybar);
      expect(Hbar).toHaveBeenCalledWith('100000000', HbarUnit.Tinybar);
      expect(mockTransferTransaction.addHbarTransfer).toHaveBeenCalledTimes(2);
      expect(result.transaction).toBe(mockTransferTransaction);
    });

    it('should set memo when provided', async () => {
      const params = {
        amount: 50_000_000n,
        from: ACCOUNT_ID_FROM_1,
        to: ACCOUNT_ID_TO_1,
        memo: 'Test transfer memo',
      };

      await hbarService.transferTinybar(params);

      expect(mockTransferTransaction.setTransactionMemo).toHaveBeenCalledWith(
        'Test transfer memo',
      );
    });

    it('should not set memo when not provided', async () => {
      const params = {
        amount: 50_000_000n,
        from: ACCOUNT_ID_FROM_1,
        to: ACCOUNT_ID_TO_1,
      };

      await hbarService.transferTinybar(params);

      expect(mockTransferTransaction.setTransactionMemo).not.toHaveBeenCalled();
    });

    it('should log debug messages during transfer creation', async () => {
      const params = {
        amount: 100_000_000n,
        from: ACCOUNT_ID_FROM_1,
        to: ACCOUNT_ID_TO_1,
        memo: 'Debug test',
      };

      await hbarService.transferTinybar(params);

      expect(logger.debug).toHaveBeenCalledWith(
        `[HBAR SERVICE] Building transfer: amount=100000000 from=${ACCOUNT_ID_FROM_1} to=${ACCOUNT_ID_TO_1} memo=Debug test`,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[HBAR SERVICE] Created transfer transaction: from=${ACCOUNT_ID_FROM_1} to=${ACCOUNT_ID_TO_1} amount=100000000`,
      );
    });

    it('should log empty memo when not provided', async () => {
      const params = {
        amount: 100_000_000n,
        from: ACCOUNT_ID_FROM_1,
        to: ACCOUNT_ID_TO_1,
      };

      await hbarService.transferTinybar(params);

      expect(logger.debug).toHaveBeenCalledWith(
        `[HBAR SERVICE] Building transfer: amount=100000000 from=${ACCOUNT_ID_FROM_1} to=${ACCOUNT_ID_TO_1} memo=`,
      );
    });

    it('should handle different account IDs', async () => {
      const params = {
        amount: 1_000_000n,
        from: ACCOUNT_ID_FROM_2,
        to: ACCOUNT_ID_TO_2,
      };

      await hbarService.transferTinybar(params);

      expect(AccountId.fromString).toHaveBeenCalledWith(ACCOUNT_ID_FROM_2);
      expect(AccountId.fromString).toHaveBeenCalledWith(ACCOUNT_ID_TO_2);
    });

    it('should handle small amounts', async () => {
      const params = {
        amount: 1n,
        from: ACCOUNT_ID_FROM_1,
        to: ACCOUNT_ID_TO_1,
      };

      await hbarService.transferTinybar(params);

      expect(Hbar).toHaveBeenCalledWith('-1', HbarUnit.Tinybar);
      expect(Hbar).toHaveBeenCalledWith('1', HbarUnit.Tinybar);
    });

    it('should handle large amounts', async () => {
      const params = {
        amount: 100_000_000_000_000n,
        from: ACCOUNT_ID_FROM_1,
        to: ACCOUNT_ID_TO_1,
      };

      await hbarService.transferTinybar(params);

      expect(Hbar).toHaveBeenCalledWith('-100000000000000', HbarUnit.Tinybar);
      expect(Hbar).toHaveBeenCalledWith('100000000000000', HbarUnit.Tinybar);
    });

    it('should throw ValidationError when from account ID is invalid', async () => {
      expect.assertions(2);

      (AccountId.fromString as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid account ID format');
      });

      const params = {
        amount: 100_000_000n,
        from: 'invalid-account',
        to: ACCOUNT_ID_TO_1,
      };

      try {
        await hbarService.transferTinybar(params);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toBe('Invalid transfer parameters');
        }
      }
    });

    it('should throw ValidationError when to account ID is invalid', async () => {
      expect.assertions(1);

      (AccountId.fromString as jest.Mock)
        .mockReturnValueOnce({})
        .mockImplementationOnce(() => {
          throw new Error('Invalid account ID format');
        });

      const params = {
        amount: 100_000_000n,
        from: ACCOUNT_ID_FROM_1,
        to: 'invalid-account',
      };

      try {
        await hbarService.transferTinybar(params);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });

    it('should throw ValidationError with context when transfer fails', async () => {
      expect.assertions(2);

      (AccountId.fromString as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid format');
      });

      const params = {
        amount: 100_000_000n,
        from: 'bad-format',
        to: ACCOUNT_ID_TO_1,
      };

      try {
        await hbarService.transferTinybar(params);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.context).toEqual({
            from: 'bad-format',
            to: ACCOUNT_ID_TO_1,
            amount: '100000000',
          });
        }
      }
    });
  });
});
