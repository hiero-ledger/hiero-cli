import { CoreApi } from '../../../core/core-api/core-api.interface';
import { createMockCoreApi } from '../../mocks/core-api.mock';
import {
  deleteAccount,
  importAccount,
  viewAccount,
} from '../../../plugins/account';
import { KeyAlgorithm, Status } from '../../../core/shared/constants';
import { setDefaultOperatorForNetwork } from '../../utils/network-and-operator-setup';
import { ViewAccountOutput } from '../../../plugins/account/commands/view';
import '../../../core/utils/json-serialize';
import { ImportAccountOutput } from '../../../plugins/account/commands/import';
import { DeleteAccountOutput } from '../../../plugins/account/commands/delete';

describe('Delete Account Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi();
    await setDefaultOperatorForNetwork(coreApi);
  });

  describe('Valid Delete Account Scenarios', () => {
    it('should delete imported account by name and verify empty result with view method', async () => {
      //import account
      const importAccountArgs: Record<string, unknown> = {
        id: '0.0.7300370',
        name: 'account-to-be-deleted',
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
      expect(importAccountOutput.name).toBe('account-to-be-deleted');
      expect(importAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(importAccountOutput.network).toBe('testnet');
      expect(importAccountOutput.evmAddress).toBe(
        '0x91d9247415c979a289aa178c4c67181e11d38872',
      );

      // view
      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-to-be-deleted',
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
      const deleteAccountArgs: Record<string, unknown> = {
        name: 'account-to-be-deleted',
      };
      const deleteAccountResult = await deleteAccount({
        args: deleteAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      expect(deleteAccountResult.status).toBe(Status.Success);
      const deleteAccountOutput: DeleteAccountOutput = JSON.parse(
        deleteAccountResult.outputJson!,
      );
      expect(deleteAccountOutput.deletedAccount.accountId).toBe('0.0.7300370');
      expect(deleteAccountOutput.deletedAccount.name).toBe(
        'account-to-be-deleted',
      );

      const viewDeletedAccountResult = await viewAccount({
        args: viewAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      expect(viewDeletedAccountResult.status).toBe(Status.Failure);
      expect(viewDeletedAccountResult.errorMessage).toContain(
        'Account not found with ID or alias: account-to-be-deleted',
      );
    });
  });
});
