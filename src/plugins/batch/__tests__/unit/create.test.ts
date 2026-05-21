import type { KeyResolverService } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { ValidationError } from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import {
  BatchCreateCommand,
  BatchCreateOutputSchema,
} from '@/plugins/batch/commands/create';

import {
  BATCH_COMPOSED_KEY,
  BATCH_KEY_REF_ID,
  BATCH_NAME,
} from './helpers/fixtures';
import { makeBatchApiMocks, makeBatchStateServiceMock } from './helpers/mocks';

describe('batch plugin - create command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates batch successfully', async () => {
    const logger = makeLogger();
    const saveBatchMock = jest.fn();
    const batchState = makeBatchStateServiceMock({
      hasBatch: jest.fn().mockReturnValue(false),
      saveBatch: saveBatchMock,
    });

    const { networkMock, kmsMock, configMock } = makeBatchApiMocks();

    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: BATCH_KEY_REF_ID,
          publicKey: 'batch-pub-key-test',
        }),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      name: BATCH_NAME,
      key: BATCH_KEY_REF_ID,
    });

    const result = await new BatchCreateCommand(batchState).execute(args);

    expect(saveBatchMock).toHaveBeenCalledWith(
      BATCH_COMPOSED_KEY,
      expect.objectContaining({
        name: BATCH_NAME,
        keyRefId: BATCH_KEY_REF_ID,
        executed: false,
        success: false,
        transactions: [],
      }),
    );

    const output = assertOutput(result.result, BatchCreateOutputSchema);
    expect(output.name).toBe(BATCH_NAME);
    expect(output.keyRefId).toBe(BATCH_KEY_REF_ID);
  });

  test('throws ValidationError when batch already exists', async () => {
    const logger = makeLogger();
    const batchState = makeBatchStateServiceMock({
      hasBatch: jest.fn().mockReturnValue(true),
    });

    const { networkMock, kmsMock, configMock } = makeBatchApiMocks();

    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      name: BATCH_NAME,
      key: BATCH_KEY_REF_ID,
    });

    await expect(
      new BatchCreateCommand(batchState).execute(args),
    ).rejects.toThrow(ValidationError);
  });

  test('uses default key manager from config when not specified', async () => {
    const logger = makeLogger();
    const resolveSigningKeyMock = jest.fn().mockResolvedValue({
      keyRefId: BATCH_KEY_REF_ID,
      publicKey: 'batch-pub-key-test',
    });
    const batchState = makeBatchStateServiceMock({
      hasBatch: jest.fn().mockReturnValue(false),
    });

    const { networkMock, kmsMock, configMock } = makeBatchApiMocks();
    configMock.getOption = jest
      .fn()
      .mockReturnValue(KeyManager.local_encrypted);

    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: resolveSigningKeyMock,
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      name: BATCH_NAME,
      key: BATCH_KEY_REF_ID,
    });

    await new BatchCreateCommand(batchState).execute(args);

    expect(resolveSigningKeyMock).toHaveBeenCalledWith(
      expect.anything(),
      KeyManager.local_encrypted,
      true,
      ['batch:signer'],
    );
  });
});
