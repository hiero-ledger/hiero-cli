import type { TransferTransaction } from '@hashgraph/sdk';
import type { TransferEntry } from '@/core/services/transfer/transfer-entries/transfer-entry.interface';

import { TransferServiceImpl } from '@/core/services/transfer/transfer-service';

const makeMockTx = () =>
  ({
    setTransactionMemo: jest.fn().mockReturnThis(),
  }) as unknown as TransferTransaction;

const mockTxInstance = makeMockTx();

jest.mock('@hashgraph/sdk', () => ({
  TransferTransaction: jest.fn(() => mockTxInstance),
  TokenType: {
    NonFungibleUnique: 'NON_FUNGIBLE_UNIQUE',
    FungibleCommon: 'FUNGIBLE_COMMON',
  },
}));

function makeEntry(): jest.Mocked<TransferEntry> {
  return { apply: jest.fn() };
}

describe('TransferServiceImpl', () => {
  let service: TransferServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransferServiceImpl();
  });

  describe('buildTransferTransaction', () => {
    it('throws when entries array is empty', () => {
      expect(() => service.buildTransferTransaction([])).toThrow(
        'buildTransferTransaction requires at least one entry',
      );
    });

    it('creates a transaction and applies a single entry', () => {
      const entry = makeEntry();
      const result = service.buildTransferTransaction([entry]);

      expect(entry.apply).toHaveBeenCalledWith(mockTxInstance);
      expect(result).toBe(mockTxInstance);
    });

    it('applies all entries in order', () => {
      const callOrder: number[] = [];
      const entry1 = {
        apply: jest.fn().mockImplementation(() => callOrder.push(1)),
      };
      const entry2 = {
        apply: jest.fn().mockImplementation(() => callOrder.push(2)),
      };

      service.buildTransferTransaction([entry1, entry2]);

      expect(entry1.apply).toHaveBeenCalledWith(mockTxInstance);
      expect(entry2.apply).toHaveBeenCalledWith(mockTxInstance);
      expect(callOrder).toEqual([1, 2]);
    });

    it('sets memo when provided', () => {
      const entry = makeEntry();
      service.buildTransferTransaction([entry], 'test memo');

      expect(mockTxInstance.setTransactionMemo).toHaveBeenCalledWith(
        'test memo',
      );
    });

    it('does not set memo when not provided', () => {
      const entry = makeEntry();
      service.buildTransferTransaction([entry]);

      expect(mockTxInstance.setTransactionMemo).not.toHaveBeenCalled();
    });

    it('does not set memo when memo is empty string', () => {
      const entry = makeEntry();
      service.buildTransferTransaction([entry], '');

      expect(mockTxInstance.setTransactionMemo).not.toHaveBeenCalled();
    });

    it('returns the transaction instance', () => {
      const entry = makeEntry();
      const result = service.buildTransferTransaction([entry]);

      expect(result).toBe(mockTxInstance);
    });
  });
});
