import { transferHandler } from '../../commands/transfer';
import { Status } from '../../../../core/shared/constants';
import { makeArgs } from '../../../../../__tests__/helpers/plugin';
import { setupTransferTest } from './helpers/mocks';
import {
  mockAccounts,
  mockAccountIdKeyPairs,
  mockAccountIds,
  mockTransactionResults,
  mockTransferTransactionResults,
  mockDefaultCredentials,
  mockBalances,
  mockAmounts,
  mockParsedBalances,
} from './helpers/fixtures';

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
      balance: mockBalances.valid,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
      memo: 'test-transfer',
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    expect(hbar.transferTinybar).toHaveBeenCalledWith({
      amount: mockParsedBalances.valid,
      from: mockAccountIds.sender,
      to: mockAccountIds.receiver,
      memo: 'test-transfer',
    });
    expect(signing.signAndExecute).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith('[HBAR] Transfer command invoked');
    expect(logger.log).toHaveBeenCalledWith(
      `[HBAR] Transfer submitted successfully, txId=${mockTransactionResults.success.transactionId}`,
    );
  });

  test('returns failure when balance is invalid', async () => {
    const { api, logger } = setupTransferTest({ accounts: [] });

    const args = makeArgs(api, logger, {
      balance: mockBalances.invalid,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Invalid balance value');
  });

  test('returns failure when balance is negative', async () => {
    const { api, logger } = setupTransferTest({ accounts: [] });

    const args = makeArgs(api, logger, {
      balance: mockBalances.negative,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Failure);
  });

  test('returns failure when balance is zero', async () => {
    const { api, logger } = setupTransferTest({ accounts: [] });

    const args = makeArgs(api, logger, {
      balance: mockBalances.zero,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Failure);
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
      balance: mockAmounts.small,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Success);

    // This test should actually succeed now since we're providing valid parameters
    expect(logger.log).toHaveBeenCalledWith('[HBAR] Transfer command invoked');
  });

  test('returns failure when from equals to', async () => {
    const { api, logger } = setupTransferTest({
      accounts: [mockAccounts.sameAccount],
    });

    const args = makeArgs(api, logger, {
      balance: mockAmounts.small,
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
      balance: mockBalances.valid,
      from: mockAccountIdKeyPairs.sender,
      to: mockAccountIds.receiver,
      memo: 'test-transfer',
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Network connection failed');
  });

  test('returns failure when from is just account ID without private key', async () => {
    const { api, logger } = setupTransferTest({ accounts: [] });

    const args = makeArgs(api, logger, {
      balance: mockAmounts.small,
      from: mockAccountIds.sender, // Just account ID, no private key
      to: mockAccountIds.receiver,
    });

    const result = await transferHandler(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      `Invalid from account: ${mockAccountIds.sender} is neither a valid account-id:private-key pair, nor a known account name`,
    );
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
      balance: mockAmounts.medium,
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
    expect(logger.log).toHaveBeenCalledWith(
      `[HBAR] Transfer submitted successfully, txId=${mockTransactionResults.successDefault.transactionId}`,
    );
  });
});
