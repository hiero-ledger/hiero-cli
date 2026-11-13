import type { CoreApi } from '@/core/core-api/core-api.interface';

import { returnFundsFromCreatedAccountsToMainAccount } from '@/__tests__/utils/teardown';
import { accountImport, accountList, accountView } from '@/plugins/account';
import { hbarTransfer } from '@/plugins/hbar/commands/transfer';

jest.mock('@/plugins/account', () => ({
  accountImport: jest.fn(),
  accountList: jest.fn(),
  accountView: jest.fn(),
}));

jest.mock('@/plugins/hbar/commands/transfer', () => ({
  hbarTransfer: jest.fn(),
}));

describe('teardown - fund return', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const stubRefundFlow = (
    stateAccounts: Array<{ name: string; origin?: 'created' | 'imported' }>,
  ): void => {
    jest.mocked(accountList).mockResolvedValue({
      result: {
        totalCount: stateAccounts.length,
        accounts: stateAccounts.map((account, index) => ({
          accountId: `0.0.${1000 + index}`,
          ...account,
        })),
      },
    });
    jest.mocked(accountImport).mockResolvedValue({ result: {} });

    // The first main-account read happens before the refunds (so it returns
    // the starting balance), every later read must show the credited balance
    // for the confirmation wait to succeed. Named accounts still hold funds.
    let mainBalanceReads = 0;
    jest.mocked(accountView).mockImplementation((callArgs) => {
      const account = String(callArgs.args.account);
      if (account !== 'main-account') {
        return Promise.resolve({ result: { balance: 10n } });
      }
      mainBalanceReads += 1;
      return Promise.resolve({
        result: { balance: mainBalanceReads === 1 ? 0n : 1n },
      });
    });
  };

  const refundedFromAccounts = (): Array<string | undefined> =>
    jest
      .mocked(hbarTransfer)
      .mock.calls.map(([callArgs]) => callArgs.args.from as string | undefined);

  test('refunds created accounts but never imported ones', async () => {
    stubRefundFlow([
      { name: 'created-acc', origin: 'created' },
      { name: 'imported-acc', origin: 'imported' },
    ]);

    await returnFundsFromCreatedAccountsToMainAccount({} as CoreApi);

    expect(refundedFromAccounts()).toEqual(['created-acc']);
  });

  test('treats accounts stored without origin (older CLI state) as created', async () => {
    stubRefundFlow([{ name: 'legacy-acc' }]);

    await returnFundsFromCreatedAccountsToMainAccount({} as CoreApi);

    expect(refundedFromAccounts()).toEqual(['legacy-acc']);
  });
});
