import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AccountImportOutput } from '@/plugins/account/commands/import';
import type { AccountViewOutput } from '@/plugins/account/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { accountImport, accountView } from '@/plugins/account';

describe('Import Account Integration Tests', () => {
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
      network === SupportedNetwork.LOCALNET ? '0.0.1004' : '0.0.7300370';
    accountKey =
      network === SupportedNetwork.LOCALNET
        ? '3030020100300706052b8104000a0422042045a5a7108a18dd5013cf2d5857a28144beadc9c70b3bdbd914e38df4e804b8d8'
        : '3030020100300706052b8104000a042204206790ef7f62d1b4a2d2fdcf4e0fc0882b86786dfbb1efc9ace8a2e3656adea122';
    evmAddress =
      network === SupportedNetwork.LOCALNET
        ? '0x927e41ff8307835a1c081e0d7fd250625f2d4d0e'
        : '0x91d9247415c979a289aa178c4c67181e11d38872';
  });

  describe('Valid Import Account Scenarios', () => {
    it('should import an account and verify with view method', async () => {
      const importAccountArgs: Record<string, unknown> = {
        name: 'account-imported',
        key: `${accountId}:${accountKey}`,
      };
      const importAccountResult = await accountImport({
        args: importAccountArgs,
        api: coreApi,
      });

      const importAccountOutput =
        importAccountResult.result as AccountImportOutput;
      expect(importAccountOutput.accountId).toBe(accountId);
      expect(importAccountOutput.name).toBe('account-imported');
      expect(importAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(importAccountOutput.network).toBe(network);
      expect(importAccountOutput.evmAddress).toBe(evmAddress);

      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-imported',
      };
      const viewAccountResult = await accountView({
        args: viewAccountArgs,
        api: coreApi,
      });
      const viewAccountOutput = viewAccountResult.result as AccountViewOutput;
      expect(viewAccountOutput.accountId).toBe(importAccountOutput.accountId);
      expect(viewAccountOutput.evmAddress).toBe(importAccountOutput.evmAddress);
    });
  });
});
