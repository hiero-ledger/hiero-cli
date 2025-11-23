import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CoreApi } from '../../../core/core-api/core-api.interface';
import { createMockCoreApi } from '../../mocks/core-api.mock';
import {
  clearAccounts,
  importAccount,
  listAccounts,
  viewAccount,
} from '../../../plugins/account';
import { KeyAlgorithm, Status } from '../../../core/shared/constants';
import { setDefaultOperatorForNetwork } from '../../utils/network-and-operator-setup';
import { ViewAccountOutput } from '../../../plugins/account/commands/view';
import '../../../core/utils/json-serialize';
import { deleteStateFiles } from '../../utils/teardown';
import { STATE_STORAGE_FILE_PATH } from '../../test-constants';
import { ImportAccountOutput } from '../../../plugins/account/commands/import';
import { ClearAccountsOutput } from '../../../plugins/account/commands/clear';
import { ListAccountsOutput } from '../../../plugins/account/commands/list';

describe('Clear Account Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi();
    setDefaultOperatorForNetwork(coreApi);
  });

  afterAll(async () => {
    await deleteStateFiles(STATE_STORAGE_FILE_PATH);
  });

  describe('Valid Clear Account Scenarios', () => {
    it('should clear imported account by name and verify empty result with list method', async () => {
      //import account
      const importAccountArgs: Record<string, unknown> = {
        id: '0.0.7300370',
        name: 'account-to-be-cleared',
        key: '3030020100300706052b8104000a042204206790ef7f62d1b4a2d2fdcf4e0fc0882b86786dfbb1efc9ace8a2e3656adea122',
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
      expect(importAccountOutput.accountId).toBe('0.0.7300370');
      expect(importAccountOutput.name).toBe('account-to-be-cleared');
      expect(importAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(importAccountOutput.network).toBe('testnet');
      expect(importAccountOutput.evmAddress).toBe(
        '0x91d9247415c979a289aa178c4c67181e11d38872',
      );

      // view
      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-to-be-cleared',
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
      expect(viewAccountOutput.balance).toBe('0'); // result in tinybars
      expect(viewAccountOutput.evmAddress).toBe(importAccountOutput.evmAddress);

      //delete
      const clearAccountArgs: Record<string, unknown> = {};
      const clearAccountResult = await clearAccounts({
        args: clearAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      expect(clearAccountResult.status).toBe(Status.Success);
      const clearAccountOutput: ClearAccountsOutput = JSON.parse(
        clearAccountResult.outputJson!,
      );
      expect(clearAccountOutput.clearedCount).toBe(1);

      const listClearedAccountResult = await listAccounts({
        args: {},
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      expect(listClearedAccountResult.status).toBe(Status.Success);
      const listClearedAccountOutput: ListAccountsOutput = JSON.parse(
        listClearedAccountResult.outputJson!,
      );
      expect(listClearedAccountOutput.accounts.length).toBe(0);
    });
  });
});
