import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ImportAccountOutput } from '@/plugins/account/commands/import';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import { importAccount, viewAccount } from '@/plugins/account';

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
    accountId = network === 'localnet' ? '0.0.1003' : '0.0.7300370';
    accountKey =
      network === 'localnet'
        ? '3030020100300706052b8104000a042204206ec1f2e7d126a74a1d2ff9e1c5d90b92378c725e506651ff8bb8616a5c724628'
        : '3030020100300706052b8104000a042204206790ef7f62d1b4a2d2fdcf4e0fc0882b86786dfbb1efc9ace8a2e3656adea122';
    evmAddress =
      network === 'localnet'
        ? '0x00000000000000000000000000000000000003eb'
        : '0x91d9247415c979a289aa178c4c67181e11d38872';
  });

  describe('Valid Import Account Scenarios', () => {
    it('should import an account and verify with view method', async () => {
      const importAccountArgs: Record<string, unknown> = {
        name: 'account-imported',
        key: `${accountId}:${accountKey}`,
      };
      const importAccountResult = await importAccount({
        args: importAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      expect(importAccountResult.status).toBe(Status.Success);
      const importAccountOutput: ImportAccountOutput = JSON.parse(
        importAccountResult.outputJson!,
      );
      expect(importAccountOutput.accountId).toBe(accountId);
      expect(importAccountOutput.name).toBe('account-imported');
      expect(importAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(importAccountOutput.network).toBe(network);
      expect(importAccountOutput.evmAddress).toBe(evmAddress);

      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-imported',
      };
      const viewAccountResult = await viewAccount({
        args: viewAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      expect(viewAccountResult.status).toBe(Status.Success);
      const viewAccountOutput: ViewAccountOutput = JSON.parse(
        viewAccountResult.outputJson!,
      );
      expect(viewAccountOutput.accountId).toBe(importAccountOutput.accountId);
      expect(viewAccountOutput.evmAddress).toBe(importAccountOutput.evmAddress);
    });
  });
});
