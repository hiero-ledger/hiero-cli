import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';

import { makeArgs, makeKmsMock, makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError } from '@/core';
import { ListCredentialsOutputSchema } from '@/plugins/credentials/commands/list';
import { credentialsList } from '@/plugins/credentials/commands/list/handler';

describe('credentials plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays message when no credentials are stored', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.list.mockReturnValue([]);

    const args = makeArgs({ kms: kmsService }, logger, {});

    const result = await credentialsList(args);
    const output = assertOutput(result.result, ListCredentialsOutputSchema);

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
        publicKey:
          '02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        labels: ['test', 'dev'],
      },
      {
        keyRefId: 'kr_test456',
        keyManager: 'local_encrypted' as KeyManagerName,
        publicKey:
          '02bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    ];

    kmsService.list.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService }, logger, {});

    const result = await credentialsList(args);
    const output = assertOutput(result.result, ListCredentialsOutputSchema);

    expect(output.totalCount).toBe(2);
    expect(output.credentials).toHaveLength(2);
    expect(output.credentials[0]).toEqual(
      expect.objectContaining({
        keyRefId: 'kr_test123',
        publicKey:
          '02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    );
    expect(output.credentials[1]).toEqual(
      expect.objectContaining({
        keyRefId: 'kr_test456',
        publicKey:
          '02bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      }),
    );
  });

  test('propagates KMS service errors', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.list.mockImplementation(() => {
      throw new InternalError('KMS service error');
    });

    const args = makeArgs({ kms: kmsService }, logger, {});

    await expect(credentialsList(args)).rejects.toThrow('KMS service error');
  });
});
