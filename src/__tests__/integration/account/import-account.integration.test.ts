import { CoreApi } from '../../../core/core-api/core-api.interface';
import { createMockCoreApi } from '../../mocks/core-api.mock';
import { importAccount, viewAccount } from '../../../plugins/account';
import { KeyAlgorithm, Status } from '../../../core/shared/constants';
import { setDefaultOperatorForNetwork } from '../../utils/network-and-operator-setup';
import { ViewAccountOutput } from '../../../plugins/account/commands/view';
import '../../../core/utils/json-serialize';
import { ImportAccountOutput } from '../../../plugins/account/commands/import';

describe('Import Account Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi();
    await setDefaultOperatorForNetwork(coreApi);
  });

  describe('Valid Import Account Scenarios', () => {
    it('should import an account and verify with view method', async () => {
      const importAccountArgs: Record<string, unknown> = {
        id: '0.0.7300370',
        name: 'account-imported',
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
      expect(importAccountOutput.name).toBe('account-imported');
      expect(importAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(importAccountOutput.network).toBe('testnet');
      expect(importAccountOutput.evmAddress).toBe(
        '0x91d9247415c979a289aa178c4c67181e11d38872',
      );

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
      expect(viewAccountOutput.balance).toBe('0'); // result in tinybars
      expect(viewAccountOutput.evmAddress).toBe(importAccountOutput.evmAddress);
    });
  });
});
