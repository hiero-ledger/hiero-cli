import type { TransferOutput } from '@/plugins/hbar/commands/transfer/output';

import '@/core/utils/json-serialize';

import { ZodError } from 'zod';

import { makeArgs } from '@/__tests__/mocks/mocks';
import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { Status } from '@/core/shared/constants';
import { transferHandler } from '@/plugins/hbar/commands/transfer';
import { TransferInputSchema } from '@/plugins/hbar/commands/transfer/input';
import { TransferOutputSchema } from '@/plugins/hbar/commands/transfer/output';

import {
  mockAccountIdKeyPairs,
  mockAccountIds,
  mockAccounts,
  mockAmounts,
  mockDefaultCredentials,
  mockParsedBalances,
  mockTransactionResults,
  mockTransferTransactionResults,
} from './helpers/fixtures';
import { setupTransferTest } from './helpers/mocks';

jest.mock('../../../account/zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

describe('hbar plugin - transfer command (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('transfers HBAR successfully when all params provided', async () => {
    const { api, logger, hbar, signing } = setupTransferTest({
      transferImpl: jest
        .fn()
        .mockResolvedValue(mockTransferTransactionResults.empty),
      signAndExecuteImpl: jest
        .fn()
        .mockResolvedValue(mockTransactionResults.success),
      accounts: [mockAccounts.sender, mockAccounts.receiver],
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.large,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
      memo: 'test-transfer',
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = validateOutputSchema<TransferOutput>(
      result.outputJson!,
      TransferOutputSchema,
    );
    expect(output.transactionId).toBeDefined();

    expect(hbar.transferTinybar).toHaveBeenCalledWith({
      amount: mockParsedBalances.large,
      from: mockAccountIds.sender,
      to: mockAccountIds.receiver,
      memo: 'test-transfer',
    });
    expect(signing.signAndExecute).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('[HBAR] Transfer command invoked');
    expect(logger.info).toHaveBeenCalledWith(
      `[HBAR] Transfer submitted successfully, txId=${mockTransactionResults.success.transactionId}`,
    );
  });

  test('returns failure when balance is invalid', () => {
    // SIMPLE validation → test schema directly
    expect(() => {
      TransferInputSchema.parse({
        amount: mockAmounts.invalid,
        from: mockAccountIdKeyPairs.sender,
        to: mockAccountIds.receiver,
      });
    }).toThrow(ZodError);
  });

  test('returns failure when balance is negative', () => {
    // SIMPLE validation → test schema directly
    expect(() => {
      TransferInputSchema.parse({
        amount: mockAmounts.negative,
        from: mockAccountIdKeyPairs.sender,
        to: mockAccountIds.receiver,
      });
    }).toThrow(ZodError);
  });

  test('returns failure when balance is zero', async () => {
    const { api, logger } = setupTransferTest({ accounts: [] });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.zero,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
    });

    // Zod schema validation should reject amount=0
    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Transfer amount must be greater than zero',
    );
  });

  test('succeeds when valid params provided (no default accounts check)', async () => {
    const { api, logger } = setupTransferTest({
      accounts: [],
      transferImpl: jest
        .fn()
        .mockResolvedValue(mockTransferTransactionResults.empty),
      signAndExecuteImpl: jest
        .fn()
        .mockResolvedValue(mockTransactionResults.successGeneric),
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.small,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Success);

    // This test should actually succeed now since we're providing valid parameters
    expect(logger.info).toHaveBeenCalledWith('[HBAR] Transfer command invoked');
  });

  test('returns failure when from equals to', async () => {
    const { api, logger, alias } = setupTransferTest({
      accounts: [mockAccounts.sameAccount],
    });

    // Mock alias resolution for 'same-account'
    (alias.resolve as jest.Mock).mockImplementation((aliasName) => {
      if (aliasName === 'same-account') {
        return {
          entityId: mockAccountIds.sender,
          keyRefId: 'same-account-key',
          publicKey: '302a300506032b6570032100' + '0'.repeat(64),
        };
      }
      return null;
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.small,
      from: 'same-account',
      to: 'same-account',
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Cannot transfer');
  });

  test('returns failure when transferTinybar fails', async () => {
    const { api, logger } = setupTransferTest({
      transferImpl: jest
        .fn()
        .mockRejectedValue(new Error('Network connection failed')),
      accounts: [mockAccounts.sender, mockAccounts.receiver],
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.large,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
      memo: 'test-transfer',
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Network connection failed');
  });

  test('returns failure when from is just account ID without private key', () => {
    // SIMPLE validation → test schema directly
    expect(() => {
      TransferInputSchema.parse({
        amount: mockAmounts.small,
        from: mockAccountIds.sender, // Just account ID, no private key
        to: mockAccountIds.receiver,
      });
    }).toThrow(ZodError);
  });

  test('uses default credentials as from when not provided', async () => {
    const { api, logger, hbar } = setupTransferTest({
      transferImpl: jest
        .fn()
        .mockResolvedValue(mockTransferTransactionResults.empty),
      signAndExecuteImpl: jest
        .fn()
        .mockResolvedValue(mockTransactionResults.successDefault),
      accounts: [mockAccounts.receiver],
      defaultCredentials: mockDefaultCredentials.testnet,
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.medium,
      from: mockAccountIdKeyPairs.default,
      to: mockAccountIds.receiver,
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Success);

    // The transfer command uses the default operator from the signing service
    expect(hbar.transferTinybar).toHaveBeenCalledWith({
      amount: mockParsedBalances.medium,
      from: mockAccountIds.default,
      to: mockAccountIds.receiver,
      memo: undefined,
    });
    expect(logger.info).toHaveBeenCalledWith(
      `[HBAR] Transfer submitted successfully, txId=${mockTransactionResults.successDefault.transactionId}`,
    );
  });
});
