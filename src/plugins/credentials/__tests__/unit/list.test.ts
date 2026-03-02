import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { ListCredentialsOutput } from '@/plugins/credentials/commands/list/output';

import { makeArgs, makeKmsMock, makeLogger } from '@/__tests__/mocks/mocks';
import { listCredentials } from '@/plugins/credentials/commands/list/handler';

describe('credentials plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays message when no credentials are stored', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.list.mockReturnValue([]);

    const args = makeArgs({ kms: kmsService }, logger, {});

    const result = await listCredentials(args);
    const output = result.result as ListCredentialsOutput;

    expect(output.credentials).toHaveLength(0);
    expect(output.totalCount).toBe(0);
  });

  test('displays credentials when available', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    const mockCredentials = [
      {
        keyRefId: 'kr_test123',
        keyManager: 'local' as KeyManagerName,
        publicKey: 'pub-key-123',
        labels: ['test', 'dev'],
      },
      {
        keyRefId: 'kr_test456',
        keyManager: 'local_encrypted' as KeyManagerName,
        publicKey: 'pub-key-456',
      },
    ];

    kmsService.list.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService }, logger, {});

    const result = await listCredentials(args);
    const output = result.result as ListCredentialsOutput;

    expect(output.totalCount).toBe(2);
    expect(output.credentials).toHaveLength(2);
    expect(output.credentials[0]).toEqual(
      expect.objectContaining({
        keyRefId: 'kr_test123',
        publicKey: 'pub-key-123',
      }),
    );
    expect(output.credentials[1]).toEqual(
      expect.objectContaining({
        keyRefId: 'kr_test456',
        publicKey: 'pub-key-456',
      }),
    );
  });

  test('propagates KMS service errors', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.list.mockImplementation(() => {
      throw new Error('KMS service error');
    });

    const args = makeArgs({ kms: kmsService }, logger, {});

    await expect(listCredentials(args)).rejects.toThrow('KMS service error');
  });
});
