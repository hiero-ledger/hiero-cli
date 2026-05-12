import '@/core/utils/json-serialize';

import { ZodError } from 'zod';

import { makeArgs } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { StateError, ValidationError } from '@/core/errors';
import { HbarTransferEntry } from '@/core/services/transfer';
import {
  hbarTransfer,
  HbarTransferOutputSchema,
} from '@/plugins/hbar/commands/transfer';
import { HbarTransferInputSchema } from '@/plugins/hbar/commands/transfer/input';

import {
  mockAccountIdKeyPairs,
  mockAccountIds,
  mockAmounts,
  mockDefaultCredentials,
  mockParsedBalances,
  mockTransactionResults,
  mockTransferTransactionResults,
} from './helpers/fixtures';
import { setupTransferTest } from './helpers/mocks';

describe('hbar plugin - transfer command (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('transfers HBAR successfully when all params provided', async () => {
    const { api, logger, transfer, txExecute } = setupTransferTest({
      transferImpl: jest
        .fn()
        .mockReturnValue(mockTransferTransactionResults.empty.transaction),
      signAndExecuteImpl: jest
        .fn()
        .mockResolvedValue(mockTransactionResults.success),
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.large,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
      memo: 'test-transfer',
    });

    const result = await hbarTransfer(args);
    const output = assertOutput(result.result, HbarTransferOutputSchema);

    expect(output.transactionId).toBe(
      mockTransactionResults.success.transactionId,
    );
    expect(output.toAccountId).toBe(mockAccountIds.receiver);

    expect(transfer.buildTransferTransaction).toHaveBeenCalledWith(
      [
        new HbarTransferEntry(
          mockAccountIds.sender,
          mockAccountIds.receiver,
          mockParsedBalances.large,
        ),
      ],
      'test-transfer',
    );
    expect(txExecute.execute).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('[HBAR] Transfer command invoked');
    expect(logger.info).toHaveBeenCalledWith(
      `[HBAR] Transfer submitted successfully, txId=${mockTransactionResults.success.transactionId}`,
    );
  });

  test('returns failure when balance is invalid', () => {
    // SIMPLE validation → test schema directly
    expect(() => {
      HbarTransferInputSchema.parse({
        amount: mockAmounts.invalid,
        from: mockAccountIdKeyPairs.sender,
        to: mockAccountIds.receiver,
      });
    }).toThrow(ZodError);
  });

  test('returns failure when balance is negative', () => {
    // SIMPLE validation → test schema directly
    expect(() => {
      HbarTransferInputSchema.parse({
        amount: mockAmounts.negative,
        from: mockAccountIdKeyPairs.sender,
        to: mockAccountIds.receiver,
      });
    }).toThrow(ZodError);
  });

  test('returns failure when balance is zero', async () => {
    const { api, logger } = setupTransferTest();

    const args = makeArgs(api, logger, {
      amount: mockAmounts.zero,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
    });

    await expect(hbarTransfer(args)).rejects.toThrow(ZodError);
  });

  test('succeeds when valid params provided (no default accounts check)', async () => {
    const { api, logger } = setupTransferTest({
      transferImpl: jest
        .fn()
        .mockReturnValue(mockTransferTransactionResults.empty.transaction),
      signAndExecuteImpl: jest
        .fn()
        .mockResolvedValue(mockTransactionResults.successGeneric),
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.small,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
    });

    const result = await hbarTransfer(args);
    const output = assertOutput(result.result, HbarTransferOutputSchema);

    expect(output).toBeDefined();
    expect(logger.info).toHaveBeenCalledWith('[HBAR] Transfer command invoked');
  });

  test('returns failure when from equals to', async () => {
    const { api, logger, alias } = setupTransferTest();

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

    await expect(hbarTransfer(args)).rejects.toThrow(ValidationError);
  });

  test('returns failure when buildTransferTransaction fails', async () => {
    const { api, logger } = setupTransferTest({
      transferImpl: jest.fn().mockImplementation(() => {
        throw new Error('Network connection failed');
      }),
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.large,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
      memo: 'test-transfer',
    });

    await expect(hbarTransfer(args)).rejects.toThrow(
      'Network connection failed',
    );
  });

  test('returns failure when from is just account ID without private key', async () => {
    const { api, logger } = setupTransferTest();

    const args = makeArgs(api, logger, {
      amount: mockAmounts.small,
      from: mockAccountIds.sender,
      to: mockAccountIds.receiver,
    });

    await expect(hbarTransfer(args)).rejects.toThrow(StateError);
  });

  test('uses default credentials as from when not provided', async () => {
    const { api, logger, transfer } = setupTransferTest({
      transferImpl: jest
        .fn()
        .mockReturnValue(mockTransferTransactionResults.empty.transaction),
      signAndExecuteImpl: jest
        .fn()
        .mockResolvedValue(mockTransactionResults.successDefault),
      defaultCredentials: mockDefaultCredentials.testnet,
    });

    const args = makeArgs(api, logger, {
      amount: mockAmounts.medium,
      from: mockAccountIdKeyPairs.default,
      to: mockAccountIds.receiver,
    });

    const result = await hbarTransfer(args);
    const output = assertOutput(result.result, HbarTransferOutputSchema);

    expect(output).toBeDefined();

    expect(transfer.buildTransferTransaction).toHaveBeenCalledWith(
      [
        new HbarTransferEntry(
          mockAccountIds.default,
          mockAccountIds.receiver,
          mockParsedBalances.medium,
        ),
      ],
      undefined,
    );
    expect(logger.info).toHaveBeenCalledWith(
      `[HBAR] Transfer submitted successfully, txId=${mockTransactionResults.successDefault.transactionId}`,
    );
  });
});
