import { makeArgs, makeKmsMock, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { removeCredentials } from '@/plugins/credentials/commands/remove/handler';

// No process.exit usage in handler version

describe('credentials plugin - remove command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('removes credentials successfully', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.getPublicKey.mockReturnValue('pub-key-test');

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_test123',
    });

    return removeCredentials(args).then((result) => {
      expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_test123');
      expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
      expect(result.status).toBe(Status.Success);
      const output = JSON.parse(result.outputJson!);
      expect(output).toEqual({ keyRefId: 'kr_test123', removed: true });
    });
  });

  test('returns failure when credential does not exist', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.getPublicKey.mockReturnValue(null);

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_nonexistent',
    });

    return removeCredentials(args).then((result) => {
      expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_nonexistent');
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
    kmsService.getPublicKey.mockReturnValue('pub-key-test');

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    return removeCredentials(args).then((result) => {
      expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_test123');
      expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
      expect(result.status).toBe(Status.Success);
      const output = JSON.parse(result.outputJson!);
      expect(output.removed).toBe(true);
    });
  });

  test('handles KMS service errors', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.getPublicKey.mockReturnValue('pub-key-test');
    kmsService.remove.mockImplementation(() => {
      throw new Error('KMS service error');
    });

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_test123',
    });

    return removeCredentials(args).then((result) => {
      expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_test123');
      expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to remove credentials');
      const output = JSON.parse(result.outputJson!);
      expect(output.removed).toBe(false);
    });
  });
});
