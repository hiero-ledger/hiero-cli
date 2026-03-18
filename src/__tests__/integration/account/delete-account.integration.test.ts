import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AccountDeleteOutput } from '@/plugins/account/commands/delete';
import type { AccountImportOutput } from '@/plugins/account/commands/import';
import type { AccountViewOutput } from '@/plugins/account/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { accountDelete, accountImport, accountView } from '@/plugins/account';

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
        ? '3030020100300706052b8104000a042204200e2161b2e6f2d801ef364042e6c0792aa10e07fa38680de06d4db0036c44f4b6'
        : '3030020100300706052b8104000a042204206790ef7f62d1b4a2d2fdcf4e0fc0882b86786dfbb1efc9ace8a2e3656adea122';
    evmAddress =
      network === SupportedNetwork.LOCALNET
        ? '0x00000000000000000000000000000000000003eb'
        : '0x91d9247415c979a289aa178c4c67181e11d38872';
  });

  describe('Valid Delete Account Scenarios', () => {
    it('should delete imported account by name and verify empty result with view method', async () => {
      const importAccountArgs: Record<string, unknown> = {
        name: 'account-to-be-deleted',
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
      expect(importAccountOutput.name).toBe('account-to-be-deleted');
      expect(importAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(importAccountOutput.network).toBe(network);
      expect(importAccountOutput.evmAddress).toBe(evmAddress);

      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-to-be-deleted',
      };
      const viewAccountResult = await accountView({
        args: viewAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const viewAccountOutput = viewAccountResult.result as AccountViewOutput;
      expect(viewAccountOutput.accountId).toBe(importAccountOutput.accountId);
      expect(viewAccountOutput.evmAddress).toBe(importAccountOutput.evmAddress);

      const deleteAccountArgs: Record<string, unknown> = {
        account: 'account-to-be-deleted',
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
      expect(deleteAccountOutput.deletedAccount.name).toBe(
        'account-to-be-deleted',
      );

      await expect(
        accountView({
          args: viewAccountArgs,
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }),
      ).rejects.toThrow(
        'Account not found with ID or alias: account-to-be-deleted',
      );
    });
  });
});
