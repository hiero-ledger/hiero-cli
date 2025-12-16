import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';
import type { ListCredentialsOutput } from '@/plugins/credentials/commands/list/output';
import type { RemoveCredentialsOutput } from '@/plugins/credentials/commands/remove/output';

import { createMockCoreApi } from '@/__tests__/mocks/core-api.mock';
import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import { listCredentials, removeCredentials } from '@/plugins/credentials';

describe('Credentials Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
  });

  it('should remove credential and then verify it with list', async () => {
    const record: KmsCredentialRecord = {
      keyRefId: 'test-key',
      keyManager: 'local',
      publicKey: 'public-key-test',
      labels: ['label1', 'label2'],
      keyAlgorithm: KeyAlgorithm.ECDSA,
      createdAt: new Date().toISOString(),
    };
    coreApi.state.set('kms-credentials', record.keyRefId, record);
    const listCredentialsResult = await listCredentials({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(listCredentialsResult.status).toBe(Status.Success);
    const listCredentialsOutput: ListCredentialsOutput = JSON.parse(
      listCredentialsResult.outputJson!,
    );
    const credentialNames = listCredentialsOutput.credentials.map(
      (credential) => credential.keyRefId,
    );
    expect(credentialNames).toContain('test-key');
    const removeCredentialsArgs: Record<string, unknown> = {
      id: 'test-key',
    };
    const removeCredentialsResult = await removeCredentials({
      args: removeCredentialsArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(removeCredentialsResult.status).toBe(Status.Success);
    const removeCredentialsOutput: RemoveCredentialsOutput = JSON.parse(
      removeCredentialsResult.outputJson!,
    );
    expect(removeCredentialsOutput.keyRefId).toBe('test-key');
    expect(removeCredentialsOutput.removed).toBe(true);
    const listCredentialsAfterRemovalResult = await listCredentials({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(listCredentialsAfterRemovalResult.status).toBe(Status.Success);
    const listCredentialsAfterRemovalOutput: ListCredentialsOutput = JSON.parse(
      listCredentialsAfterRemovalResult.outputJson!,
    );
    const credentialNamesAfterRemoval =
      listCredentialsAfterRemovalOutput.credentials.map(
        (credential) => credential.keyRefId,
      );
    expect(credentialNamesAfterRemoval).not.toContain('test-key');
  });
});
