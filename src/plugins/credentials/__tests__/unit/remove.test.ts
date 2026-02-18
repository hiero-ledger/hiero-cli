import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';

import { makeArgs, makeKmsMock, makeLogger } from '@/__tests__/mocks/mocks';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import { removeCredentials } from '@/plugins/credentials/commands/remove/handler';

// No process.exit usage in handler version

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

  test('removes credentials successfully', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_test123',
    });

    return removeCredentials(args).then((result) => {
      expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
      expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
      expect(result.status).toBe(Status.Success);
      const output = JSON.parse(result.outputJson!);
      expect(output).toEqual({ keyRefId: 'kr_test123', removed: true });
    });
  });

  test('returns failure when credential does not exist', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(undefined);

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_nonexistent',
    });

    return removeCredentials(args).then((result) => {
      expect(kmsService.get).toHaveBeenCalledWith('kr_nonexistent');
      expect(kmsService.remove).not.toHaveBeenCalled();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBe(
        "Credential with key reference ID 'kr_nonexistent' does not exist",
      );
      const output = JSON.parse(result.outputJson!);
      expect(output).toEqual({
        keyRefId: 'kr_nonexistent',
        removed: false,
      });
    });
  });

  test('removes credentials with valid id', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    return removeCredentials(args).then((result) => {
      expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
      expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
      expect(result.status).toBe(Status.Success);
      const output = JSON.parse(result.outputJson!);
      expect(output.removed).toBe(true);
    });
  });

  test('handles KMS service errors', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);
    kmsService.remove.mockImplementation(() => {
      throw new Error('KMS service error');
    });

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_test123',
    });

    return removeCredentials(args).then((result) => {
      expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
      expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to remove credentials');
      const output = JSON.parse(result.outputJson!);
      expect(output.removed).toBe(false);
    });
  });
});
