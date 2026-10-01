import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AccountBalanceOutput } from '@/plugins/account/commands/balance';
import type { AccountCreateOutput } from '@/plugins/account/commands/create';
import type { AccountDeleteOutput } from '@/plugins/account/commands/delete';
import type { AccountViewOutput } from '@/plugins/account/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { waitFor } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import {
  accountBalance,
  accountCreate,
  accountDelete,
  accountView,
} from '@/plugins/account';

function tinybarsFromBalanceResult(
  result: AccountBalanceOutput | undefined,
): bigint {
  return BigInt(String(result?.hbarBalance ?? 0));
}

describe('Delete Account Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
  });

  describe('State-only delete', () => {
    it('should remove account from local state only and leave account queryable on network by ID', async () => {
      const createAccountResult = await accountCreate({
        args: {
          name: 'account-state-only-delete',
          balance: 1,
          'key-type': KeyAlgorithm.ECDSA,
        },
        api: coreApi,
      });
      const createdAccount = createAccountResult.result as AccountCreateOutput;
      const accountId = createdAccount.accountId;

      // The state-only delete still resolves the account through the mirror,
      // so a freshly created account must be indexed before it can be removed
      // from state.
      await waitFor(
        () =>
          accountView({
            args: { account: accountId },
            api: coreApi,
          }),
        (result) => !!(result.result as AccountViewOutput).accountId,
        { timeout: 10000, interval: 500 },
      );

      const deleteAccountArgs: Record<string, unknown> = {
        account: 'account-state-only-delete',
        stateOnly: true,
      };
      const deleteAccountResult = await accountDelete({
        args: deleteAccountArgs,
        api: coreApi,
      });
      const deleteAccountOutput =
        deleteAccountResult.result as AccountDeleteOutput;
      expect(deleteAccountOutput.deletedAccount.accountId).toBe(accountId);
      expect(deleteAccountOutput.stateOnly).toBe(true);
      expect(deleteAccountOutput.transactionId).toBeUndefined();

      await expect(
        accountView({
          args: { account: 'account-state-only-delete' },
          api: coreApi,
        }),
      ).rejects.toThrow(
        'Account not found with ID or alias: account-state-only-delete',
      );

      const viewById = await accountView({
        args: { account: accountId },
        api: coreApi,
      });
      const viewByIdOutput = viewById.result as AccountViewOutput;
      expect(viewByIdOutput.accountId).toBe(accountId);
      expect(viewByIdOutput.evmAddress).toBe(createdAccount.evmAddress);
    });
  });

  describe('Network delete (Hedera)', () => {
    it('should submit AccountDeleteTransaction, transfer funds to beneficiary, and remove local state', async () => {
      const createVictimResult = await accountCreate({
        args: {
          name: 'account-network-delete',
          balance: 1,
          'key-type': KeyAlgorithm.ECDSA,
          'auto-associations': 10,
        },
        api: coreApi,
      });
      const victimAccountId = (createVictimResult.result as AccountCreateOutput)
        .accountId;

      const createBeneficiaryResult = await accountCreate({
        args: {
          name: 'beneficiary-network-delete',
          balance: 1,
          'key-type': KeyAlgorithm.ECDSA,
          'auto-associations': 10,
        },
        api: coreApi,
      });
      const beneficiaryAccountId = (
        createBeneficiaryResult.result as AccountCreateOutput
      ).accountId;

      const balanceBeneficiaryBeforeResult = await waitFor(
        () =>
          accountBalance({
            args: {
              account: beneficiaryAccountId,
              raw: true,
              'hbar-only': true,
            },
            api: coreApi,
          }),
        (result) => !!(result.result as AccountBalanceOutput).accountId,
      );
      const beneficiaryBefore = tinybarsFromBalanceResult(
        balanceBeneficiaryBeforeResult.result as AccountBalanceOutput,
      );

      const deleteAccountResult = await accountDelete({
        args: {
          account: 'account-network-delete',
          transferId: beneficiaryAccountId,
        },
        api: coreApi,
      });

      const deleteAccountOutput =
        deleteAccountResult.result as AccountDeleteOutput;
      expect(deleteAccountOutput.deletedAccount.accountId).toBe(
        victimAccountId,
      );
      expect(deleteAccountOutput.transactionId).toBeDefined();
      expect(deleteAccountOutput.stateOnly).toBe(false);

      const balanceBeneficiaryAfterResult = await waitFor(
        () =>
          accountBalance({
            args: {
              account: beneficiaryAccountId,
              raw: true,
              'hbar-only': true,
            },
            api: coreApi,
          }),
        (result) =>
          tinybarsFromBalanceResult(result.result as AccountBalanceOutput) >
          beneficiaryBefore,
      );
      const beneficiaryAfter = tinybarsFromBalanceResult(
        balanceBeneficiaryAfterResult.result as AccountBalanceOutput,
      );

      expect(beneficiaryAfter).toBeGreaterThan(beneficiaryBefore);

      await expect(
        accountView({
          args: { account: 'account-network-delete' },
          api: coreApi,
        }),
      ).rejects.toThrow();
    });
  });
});
