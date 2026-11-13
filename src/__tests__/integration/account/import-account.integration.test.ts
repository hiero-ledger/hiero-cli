import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountCreateOutput } from '@/plugins/account/commands/create';
import type { AccountImportOutput } from '@/plugins/account/commands/import';
import type { AccountViewOutput } from '@/plugins/account/commands/view';

import '@/core/utils/json-serialize';

import { PrivateKey } from '@hiero-ledger/sdk';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { waitFor } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import {
  accountCreate,
  accountDelete,
  accountImport,
  accountView,
} from '@/plugins/account';

describe('Import Account Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });

  describe('Valid Import Account Scenarios', () => {
    it('should import an account and verify with view method', async () => {
      // The import must start from an account that exists on the network but
      // is not known to local state, so the test creates one with a key it
      // controls instead of relying on an account hardcoded per network. The
      // raw hex form is what the CLI itself stores for generated keys.
      const accountKey = PrivateKey.generateECDSA().toStringRaw();
      const createAccountResult = await accountCreate({
        args: {
          name: 'account-to-import',
          balance: 1,
          key: accountKey,
        },
        api: coreApi,
      });
      const createdAccount = createAccountResult.result as AccountCreateOutput;

      // Both the state-only delete and the import resolve the account through
      // the mirror, which needs a moment to index a brand-new account.
      await waitFor(
        () =>
          accountView({
            args: { account: createdAccount.accountId },
            api: coreApi,
          }),
        (result) => !!(result.result as AccountViewOutput).accountId,
        { timeout: 10000, interval: 500 },
      );
      await accountDelete({
        args: { account: 'account-to-import', stateOnly: true },
        api: coreApi,
      });

      const importAccountArgs: Record<string, unknown> = {
        name: 'account-imported',
        key: `${createdAccount.accountId}:${accountKey}`,
      };
      const importAccountResult = await accountImport({
        args: importAccountArgs,
        api: coreApi,
      });

      const importAccountOutput =
        importAccountResult.result as AccountImportOutput;
      expect(importAccountOutput.accountId).toBe(createdAccount.accountId);
      expect(importAccountOutput.name).toBe('account-imported');
      expect(importAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(importAccountOutput.network).toBe(network);
      expect(importAccountOutput.evmAddress).toBe(createdAccount.evmAddress);

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
