import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AccountBalanceOutput } from '@/plugins/account/commands/balance';
import type { AccountCreateOutput } from '@/plugins/account/commands/create';
import type { AccountDeleteOutput } from '@/plugins/account/commands/delete';
import type { AccountImportOutput } from '@/plugins/account/commands/import';
import type { AccountViewOutput } from '@/plugins/account/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  accountBalance,
  accountCreate,
  accountDelete,
  accountImport,
  accountView,
} from '@/plugins/account';

const NETWORK_DELETE_INTEGRATION_TEST_TIMEOUT_MS = 120_000;

function tinybarsFromBalanceResult(
  result: AccountBalanceOutput | undefined,
): bigint {
  return BigInt(String(result?.hbarBalance ?? 0));
}

describe('Delete Account Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;
  let accountId: string;
  let accountKey: string;
  let evmAddress: string;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
    accountId =
      network === SupportedNetwork.LOCALNET ? '0.0.1003' : '0.0.7300370';
    accountKey =
      network === SupportedNetwork.LOCALNET
        ? '3030020100300706052b8104000a042204206ec1f2e7d126a74a1d2ff9e1c5d90b92378c725e506651ff8bb8616a5c724628'
        : '3030020100300706052b8104000a042204206790ef7f62d1b4a2d2fdcf4e0fc0882b86786dfbb1efc9ace8a2e3656adea122';
    evmAddress =
      network === SupportedNetwork.LOCALNET
        ? '0x00000000000000000000000000000000000003eb'
        : '0x91d9247415c979a289aa178c4c67181e11d38872';
  });

  describe('State-only delete', () => {
    it('should remove account from local state only and leave account queryable on network by ID', async () => {
      const importAccountArgs: Record<string, unknown> = {
        name: 'account-state-only-delete',
        key: `${accountId}:${accountKey}`,
      };
      const importAccountResult = await accountImport({
        args: importAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      const importAccountOutput =
        importAccountResult.result as AccountImportOutput;
      expect(importAccountOutput.accountId).toBe(accountId);

      const deleteAccountArgs: Record<string, unknown> = {
        account: 'account-state-only-delete',
        stateOnly: true,
      };
      const deleteAccountResult = await accountDelete({
        args: deleteAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
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
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }),
      ).rejects.toThrow(
        'Account not found with ID or alias: account-state-only-delete',
      );

      const viewById = await accountView({
        args: { account: accountId },
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const viewByIdOutput = viewById.result as AccountViewOutput;
      expect(viewByIdOutput.accountId).toBe(accountId);
      expect(viewByIdOutput.evmAddress).toBe(evmAddress);
    });
  });

  describe('Network delete (Hedera)', () => {
    it(
      'should submit AccountDeleteTransaction, transfer funds to beneficiary, and remove local state',
      async () => {
        const createVictimResult = await accountCreate({
          args: {
            name: 'account-network-delete',
            balance: 1,
            'key-type': 'ecdsa',
            'auto-associations': 10,
          },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        });
        const victimAccountId = (
          createVictimResult.result as AccountCreateOutput
        ).accountId;

        const createBeneficiaryResult = await accountCreate({
          args: {
            name: 'beneficiary-network-delete',
            balance: 1,
            'key-type': 'ecdsa',
            'auto-associations': 10,
          },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        });
        const beneficiaryAccountId = (
          createBeneficiaryResult.result as AccountCreateOutput
        ).accountId;

        await delay(5000);

        const balanceBeneficiaryBeforeResult = await accountBalance({
          args: {
            account: beneficiaryAccountId,
            raw: true,
            'hbar-only': true,
          },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        });
        const beneficiaryBefore = tinybarsFromBalanceResult(
          balanceBeneficiaryBeforeResult.result as AccountBalanceOutput,
        );

        const deleteAccountResult = await accountDelete({
          args: {
            account: 'account-network-delete',
            transferId: beneficiaryAccountId,
          },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        });

        const deleteAccountOutput =
          deleteAccountResult.result as AccountDeleteOutput;
        expect(deleteAccountOutput.deletedAccount.accountId).toBe(
          victimAccountId,
        );
        expect(deleteAccountOutput.transactionId).toBeDefined();
        expect(deleteAccountOutput.stateOnly).toBe(false);

        await delay(5000);

        const balanceBeneficiaryAfterResult = await accountBalance({
          args: {
            account: beneficiaryAccountId,
            raw: true,
            'hbar-only': true,
          },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        });
        const beneficiaryAfter = tinybarsFromBalanceResult(
          balanceBeneficiaryAfterResult.result as AccountBalanceOutput,
        );

        expect(beneficiaryAfter).toBeGreaterThan(beneficiaryBefore);

        await expect(
          accountView({
            args: { account: 'account-network-delete' },
            api: coreApi,
            state: coreApi.state,
            logger: coreApi.logger,
            config: coreApi.config,
          }),
        ).rejects.toThrow();
      },
      NETWORK_DELETE_INTEGRATION_TEST_TIMEOUT_MS,
    );
  });
});
