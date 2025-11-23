import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CoreApi } from '../../../core/core-api/core-api.interface';
import { createMockCoreApi } from '../../mocks/core-api.mock';
import {
  createAccount,
  listAccounts,
  viewAccount,
} from '../../../plugins/account';
import { KeyAlgorithm, Status } from '../../../core/shared/constants';
import { CreateAccountOutput } from '../../../plugins/account/commands/create';
import { setDefaultOperatorForNetwork } from '../../utils/network-and-operator-setup';
import { ViewAccountOutput } from '../../../plugins/account/commands/view';
import { ListAccountsOutput } from '../../../plugins/account/commands/list';
import '../../../core/utils/json-serialize';
import { deleteStateFiles } from '../../utils/teardown';
import { STATE_STORAGE_FILE_PATH } from '../../test-constants';
import { delay } from '../../utils/common-utils';

describe('Create Account Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi();
    setDefaultOperatorForNetwork(coreApi);
  });

  afterAll(async () => {
    await deleteStateFiles(STATE_STORAGE_FILE_PATH);
  });

  describe('Valid Create Account Scenarios', () => {
    it('should create an account and verify with view method', async () => {
      const createAccountArgs: Record<string, unknown> = {
        name: 'account-test',
        balance: 1,
        'key-type': 'ecdsa',
        'auto-associations': 10,
      };
      const createAccountResult = await createAccount({
        args: createAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      expect(createAccountResult.status).toBe(Status.Success);
      const createAccountOutput: CreateAccountOutput = JSON.parse(
        createAccountResult.outputJson!,
      );
      expect(createAccountOutput.name).toBe('account-test');
      expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(createAccountOutput.network).toBe('testnet');

      await delay(5000);

      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-test',
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
      expect(viewAccountOutput.accountId).toBe(createAccountOutput.accountId);
      expect(viewAccountOutput.balance).toBe('100000000'); // result in tinybars
      // expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
      expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);
      const listAccountResult = await listAccounts({
        args: {},
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      expect(listAccountResult.status).toBe(Status.Success);
      const listAccountOutput: ListAccountsOutput = JSON.parse(
        listAccountResult.outputJson!,
      );
      expect(listAccountOutput.accounts.length).toBe(1);
      expect(listAccountOutput.accounts[0].accountId).toBe(
        createAccountOutput.accountId,
      );
    });
  });
});
