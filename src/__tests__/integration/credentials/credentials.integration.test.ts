import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';
import type { ListCredentialsOutput } from '@/plugins/credentials/commands/list/output';
import type { RemoveCredentialsOutput } from '@/plugins/credentials/commands/remove/output';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { listCredentials, removeCredentials } from '@/plugins/credentials';

describe('Credentials Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
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

    const listResult = await listCredentials({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listOutput = listResult.result as ListCredentialsOutput;
    const credentialNames = listOutput.credentials.map((c) => c.keyRefId);
    expect(credentialNames).toContain('test-key');

    const removeResult = await removeCredentials({
      args: { id: 'test-key' },
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const removeOutput = removeResult.result as RemoveCredentialsOutput;
    expect(removeOutput.keyRefId).toBe('test-key');
    expect(removeOutput.removed).toBe(true);

    const listAfterResult = await listCredentials({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listAfterOutput = listAfterResult.result as ListCredentialsOutput;
    const credentialNamesAfterRemoval = listAfterOutput.credentials.map(
      (c) => c.keyRefId,
    );
    expect(credentialNamesAfterRemoval).not.toContain('test-key');
  });
});
