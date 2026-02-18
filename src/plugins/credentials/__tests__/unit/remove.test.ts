import type { RemoveCredentialsOutput } from '@/plugins/credentials/commands/remove/output';

import { makeArgs, makeKmsMock, makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError } from '@/core/errors';
import { removeCredentials } from '@/plugins/credentials/commands/remove/handler';

describe('credentials plugin - remove command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('removes credentials successfully', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.getPublicKey.mockReturnValue('pub-key-test');

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    const result = await removeCredentials(args);
    const output = result.result as RemoveCredentialsOutput;

    expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
    expect(output).toEqual({ keyRefId: 'kr_test123', removed: true });
  });

  test('throws NotFoundError when credential does not exist', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.getPublicKey.mockReturnValue(null);

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_nonexistent',
    });

    await expect(removeCredentials(args)).rejects.toThrow(NotFoundError);
    expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_nonexistent');
    expect(kmsService.remove).not.toHaveBeenCalled();
  });

  test('removes credentials with valid id', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.getPublicKey.mockReturnValue('pub-key-test');

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    const result = await removeCredentials(args);
    const output = result.result as RemoveCredentialsOutput;

    expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
    expect(output.removed).toBe(true);
  });

  test('propagates KMS service errors', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.getPublicKey.mockReturnValue('pub-key-test');
    kmsService.remove.mockImplementation(() => {
      throw new Error('KMS service error');
    });

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    await expect(removeCredentials(args)).rejects.toThrow('KMS service error');
    expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
  });
});
