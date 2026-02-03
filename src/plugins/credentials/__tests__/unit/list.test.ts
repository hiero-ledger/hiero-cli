import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';

import {
  ECDSA_HEX_PUBLIC_KEY,
  ED25519_HEX_PUBLIC_KEY,
} from '@/__tests__/mocks/fixtures';
import { makeArgs, makeKmsMock, makeLogger } from '@/__tests__/mocks/mocks';
import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { Status } from '@/core/shared/constants';
import { listCredentials } from '@/plugins/credentials/commands/list/handler';
import { ListCredentialsOutputSchema } from '@/plugins/credentials/commands/list/output';

// No process.exit usage in handler version

describe('credentials plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays message when no credentials are stored', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    kmsService.list.mockReturnValue([]);

    const args = makeArgs({ kms: kmsService }, logger, {});

    return listCredentials(args).then((result) => {
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      const output = validateOutputSchema(
        result.outputJson!,
        ListCredentialsOutputSchema,
      );
      expect(output.credentials).toHaveLength(0);
      expect(output.totalCount).toBe(0);
    });
  });

  test('displays credentials when available', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    const mockCredentials = [
      {
        keyRefId: 'kr_test123',
        keyManager: 'local' as KeyManagerName,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
        labels: ['test', 'dev'],
      },
      {
        keyRefId: 'kr_test456',
        keyManager: 'local_encrypted' as KeyManagerName,
        publicKey: ED25519_HEX_PUBLIC_KEY,
      },
    ];

    kmsService.list.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService }, logger, {});

    return listCredentials(args).then((result) => {
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      const output = validateOutputSchema(
        result.outputJson!,
        ListCredentialsOutputSchema,
      );
      expect(output.totalCount).toBe(2);
      expect(output.credentials).toHaveLength(2);
      expect(output.credentials[0]).toEqual(
        expect.objectContaining({
          keyRefId: 'kr_test123',
          publicKey: ECDSA_HEX_PUBLIC_KEY,
        }),
      );
      expect(output.credentials[1]).toEqual(
        expect.objectContaining({
          keyRefId: 'kr_test456',
          publicKey: ED25519_HEX_PUBLIC_KEY,
        }),
      );
    });
  });

  test('handles KMS service errors', () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    kmsService.list.mockImplementation(() => {
      throw new Error('KMS service error');
    });

    const args = makeArgs({ kms: kmsService }, logger, {});

    return listCredentials(args).then((result) => {
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to list credentials');
    });
  });
});
