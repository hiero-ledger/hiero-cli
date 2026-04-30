import type {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
} from '@hashgraph/sdk';
import type { AllowanceEntry } from '@/core/services/allowance/allowance-entries/allowance-entry.interface';

import {
  MOCK_HEDERA_ENTITY_ID_1,
  MOCK_HEDERA_ENTITY_ID_2,
  MOCK_HEDERA_ENTITY_ID_3,
} from '@/__tests__/mocks/fixtures';
import { ValidationError } from '@/core/errors';
import { AllowanceServiceImpl } from '@/core/services/allowance/allowance-service';

const mockApproveDeleteAllSerials = jest.fn().mockReturnThis();
const mockDeleteAllTokenNftAllowances = jest.fn().mockReturnThis();

const mockApproveTxInstance = {
  deleteTokenNftAllowanceAllSerials: mockApproveDeleteAllSerials,
} as unknown as AccountAllowanceApproveTransaction;

const mockDeleteTxInstance = {
  deleteAllTokenNftAllowances: mockDeleteAllTokenNftAllowances,
} as unknown as AccountAllowanceDeleteTransaction;

jest.mock('@hashgraph/sdk', () => ({
  AccountAllowanceApproveTransaction: jest
    .fn()
    .mockImplementation(() => mockApproveTxInstance),
  AccountAllowanceDeleteTransaction: jest
    .fn()
    .mockImplementation(() => mockDeleteTxInstance),
  TokenId: {
    fromString: jest.fn().mockReturnValue({}),
  },
  AccountId: {
    fromString: jest.fn().mockReturnValue({}),
  },
  NftId: jest.fn().mockReturnValue({}),
  Long: {
    fromString: jest.fn().mockReturnValue({}),
  },
  TokenType: {
    NonFungibleUnique: 'NON_FUNGIBLE_UNIQUE',
    FungibleCommon: 'FUNGIBLE_COMMON',
  },
}));

function makeEntry(): jest.Mocked<AllowanceEntry> {
  return { apply: jest.fn() };
}

describe('AllowanceServiceImpl', () => {
  let service: AllowanceServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AllowanceServiceImpl();
  });

  describe('buildAllowanceApprove', () => {
    it('creates a transaction and applies a single entry', () => {
      const entry = makeEntry();
      const result = service.buildAllowanceApprove([entry]);

      expect(entry.apply).toHaveBeenCalledWith(mockApproveTxInstance);
      expect(result).toBe(mockApproveTxInstance);
    });

    it('applies all entries in order', () => {
      const callOrder: number[] = [];
      const entry1 = {
        apply: jest.fn().mockImplementation(() => callOrder.push(1)),
      };
      const entry2 = {
        apply: jest.fn().mockImplementation(() => callOrder.push(2)),
      };

      service.buildAllowanceApprove([entry1, entry2]);

      expect(entry1.apply).toHaveBeenCalledWith(mockApproveTxInstance);
      expect(entry2.apply).toHaveBeenCalledWith(mockApproveTxInstance);
      expect(callOrder).toEqual([1, 2]);
    });

    it('throws ValidationError when empty array passed', () => {
      expect(() => service.buildAllowanceApprove([])).toThrow(ValidationError);
    });

    it('returns the approve transaction', () => {
      const result = service.buildAllowanceApprove([makeEntry()]);

      expect(result).toBe(mockApproveTxInstance);
    });
  });

  describe('buildNftAllowanceDelete', () => {
    it('uses AccountAllowanceApproveTransaction with deleteTokenNftAllowanceAllSerials when allSerials is true', () => {
      const result = service.buildNftAllowanceDelete({
        tokenId: MOCK_HEDERA_ENTITY_ID_1,
        ownerAccountId: MOCK_HEDERA_ENTITY_ID_2,
        spenderAccountId: MOCK_HEDERA_ENTITY_ID_3,
        allSerials: true,
      });

      expect(mockApproveDeleteAllSerials).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockApproveTxInstance);
    });

    it('uses AccountAllowanceDeleteTransaction with deleteAllTokenNftAllowances for specific serials', () => {
      const result = service.buildNftAllowanceDelete({
        tokenId: MOCK_HEDERA_ENTITY_ID_1,
        ownerAccountId: MOCK_HEDERA_ENTITY_ID_2,
        serialNumbers: [1, 2, 3],
      });

      expect(mockDeleteAllTokenNftAllowances).toHaveBeenCalledTimes(3);
      expect(result).toBe(mockDeleteTxInstance);
    });

    it('calls deleteAllTokenNftAllowances once per serial number', () => {
      service.buildNftAllowanceDelete({
        tokenId: MOCK_HEDERA_ENTITY_ID_1,
        ownerAccountId: MOCK_HEDERA_ENTITY_ID_2,
        serialNumbers: [5, 10],
      });

      expect(mockDeleteAllTokenNftAllowances).toHaveBeenCalledTimes(2);
    });

    it('throws ValidationError when empty serials array passed', () => {
      expect(() =>
        service.buildNftAllowanceDelete({
          tokenId: MOCK_HEDERA_ENTITY_ID_1,
          ownerAccountId: MOCK_HEDERA_ENTITY_ID_2,
          serialNumbers: [],
        }),
      ).toThrow(ValidationError);
    });
  });
});
