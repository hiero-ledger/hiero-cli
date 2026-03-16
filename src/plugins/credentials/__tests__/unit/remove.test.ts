import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';

import { makeArgs, makeKmsMock, makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, NotFoundError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import { CredentialsRemoveOutputSchema } from '@/plugins/credentials/commands/remove';
import { credentialsRemove } from '@/plugins/credentials/commands/remove/handler';

describe('credentials plugin - remove command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCredentials: KmsCredentialRecord = {
    keyRefId: 'kr_test123',
    publicKey: 'pub-key-test',
    keyAlgorithm: KeyAlgorithm.ECDSA,
    keyManager: 'local',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('removes credentials successfully', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    const result = await credentialsRemove(args);
    const output = assertOutput(result.result, CredentialsRemoveOutputSchema);

    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
    expect(output).toEqual({ keyRefId: 'kr_test123', removed: true });
  });

  test('throws NotFoundError when credential does not exist', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(undefined);

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_nonexistent',
    });

    await expect(credentialsRemove(args)).rejects.toThrow(NotFoundError);
    expect(kmsService.get).toHaveBeenCalledWith('kr_nonexistent');
    expect(kmsService.remove).not.toHaveBeenCalled();
  });

  test('removes credentials with valid id', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    const result = await credentialsRemove(args);
    const output = assertOutput(result.result, CredentialsRemoveOutputSchema);

    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
    expect(output.removed).toBe(true);
  });

  test('propagates KMS service errors', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);
    kmsService.remove.mockImplementation(() => {
      throw new InternalError('KMS service error');
    });

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    await expect(credentialsRemove(args)).rejects.toThrow('KMS service error');
    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
  });
});
