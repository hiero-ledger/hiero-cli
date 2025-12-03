import { CoreApi } from '../../../core/core-api/core-api.interface';
import { createMockCoreApi } from '../../mocks/core-api.mock';
import { createAccount, viewAccount } from '../../../plugins/account';
import { KeyAlgorithm, Status } from '../../../core/shared/constants';
import { CreateAccountOutput } from '../../../plugins/account/commands/create';
import { setDefaultOperatorForNetwork } from '../../utils/network-and-operator-setup';
import { ViewAccountOutput } from '../../../plugins/account/commands/view';
import '../../../core/utils/json-serialize';
import { delay } from '../../utils/common-utils';

describe('Create Account Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi();
    await setDefaultOperatorForNetwork(coreApi);
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
      expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
      expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);
    });

    it('should create an account with --key-manager flag set to local', async () => {
      const createAccountArgs: Record<string, unknown> = {
        name: 'account-test-key-manager-local',
        balance: 1,
        keyType: 'ecdsa',
        keyManager: 'local',
        autoAssociations: 10,
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
      expect(createAccountOutput.name).toBe('account-test-key-manager-local');
      expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(createAccountOutput.network).toBe('testnet');

      await delay(5000);

      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-test-key-manager-local',
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
      expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
      expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);

      const credentials = coreApi.kms.list();
      const credential = credentials.find(
        (c) => c.publicKey === createAccountOutput.publicKey,
      );
      expect(credential).toBeDefined();
      expect(credential?.keyManager).toBe('local');
    });

    it('should create an account with --key-manager flag set to local_encrypted', async () => {
      const createAccountArgs: Record<string, unknown> = {
        name: 'account-test-key-manager-encrypted',
        balance: 1,
        keyType: 'ecdsa',
        keyManager: 'local_encrypted',
        autoAssociations: 10,
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
      expect(createAccountOutput.name).toBe(
        'account-test-key-manager-encrypted',
      );
      expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(createAccountOutput.network).toBe('testnet');

      await delay(5000);

      const viewAccountArgs: Record<string, unknown> = {
        account: 'account-test-key-manager-encrypted',
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
      expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
      expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);

      const credentials = coreApi.kms.list();
      const credential = credentials.find(
        (c) => c.publicKey === createAccountOutput.publicKey,
      );
      expect(credential).toBeDefined();
      expect(credential?.keyManager).toBe('local_encrypted');
    });
  });
});
