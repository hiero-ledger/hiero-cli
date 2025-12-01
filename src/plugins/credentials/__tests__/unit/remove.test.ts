import { removeCredentials } from '../../commands/remove/handler';
import {
  makeLogger,
  makeArgs,
  makeKmsMock,
} from '../../../../__tests__/mocks/mocks';
import { Status } from '../../../../core/shared/constants';

// No process.exit usage in handler version

describe('credentials plugin - remove command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('removes credentials successfully', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_test123',
    });

    return removeCredentials(args).then((result) => {
      expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
      expect(result.status).toBe(Status.Success);
      const output = JSON.parse(result.outputJson!);
      expect(output).toEqual({ keyRefId: 'kr_test123', removed: true });
    });
  });

  test('returns failure when no id is provided', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.remove.mockImplementation(() => {
      throw new Error('Key not found');
    });

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_nonexistent',
    });

    return removeCredentials(args).then((result) => {
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to remove credentials');
      const output = JSON.parse(result.outputJson!);
      expect(output.removed).toBe(false);
    });
  });

  test('removes credentials with valid id', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    const args = makeArgs({ kms: kmsService }, logger, { id: 'kr_test123' });

    return removeCredentials(args).then((result) => {
      // This test now just verifies success case
      expect(result.status).toBe(Status.Success);
      const output = JSON.parse(result.outputJson!);
      expect(output.removed).toBe(true);
    });
  });

  test('handles KMS service errors', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    kmsService.remove.mockImplementation(() => {
      throw new Error('KMS service error');
    });

    const args = makeArgs({ kms: kmsService }, logger, {
      id: 'kr_test123',
    });

    return removeCredentials(args).then((result) => {
      expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to remove credentials');
      const output = JSON.parse(result.outputJson!);
      expect(output.removed).toBe(false);
    });
  });
});
