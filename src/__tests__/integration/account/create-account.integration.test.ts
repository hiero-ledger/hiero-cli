import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountCreateOutput } from '@/plugins/account/commands/create';
import type { AccountViewOutput } from '@/plugins/account/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { accountCreate, accountView } from '@/plugins/account';

describe('Create Account Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });

  describe('Valid Create Account Scenarios', () => {
    it('should create an account and verify with view method', async () => {
      const createAccountArgs: Record<string, unknown> = {
        name: 'account-test',
        balance: 1,
        'key-type': 'ecdsa',
        'auto-associations': 10,
      };
      const createAccountResult = await accountCreate({
        args: createAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      const createAccountOutput =
        createAccountResult.result as AccountCreateOutput;
      expect(createAccountOutput.name).toBe('account-test');
      expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(createAccountOutput.network).toBe(network);

      await delay(5000);

      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-test',
      };
      const viewAccountResult = await accountView({
        args: viewAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const viewAccountOutput = viewAccountResult.result as AccountViewOutput;
      expect(viewAccountOutput.accountId).toBe(createAccountOutput.accountId);
      expect(viewAccountOutput.balance).toBe(100000000n); // result in tinybars
      expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
      expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);
    });
  });
});
