/**
 * Vanity Generate Command Tests
 */
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { VanityGenerateOutput } from '@/plugins/vanity/commands/generate';

import '@/core/utils/json-serialize';

import { makeArgs, makeKmsMock, makeLogger } from '@/__tests__/mocks/mocks';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import { generateVanity } from '@/plugins/vanity/commands/generate/handler';

describe('vanity plugin - generate command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates prefix format - accepts hex without 0x', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    // With short prefix (1 char), should find quickly
    const args = makeArgs(api, logger, {
      prefix: 'a',
      maxAttempts: 1000,
      timeout: 5,
    });

    const result = await generateVanity(args);

    // Should succeed with a 1-char prefix (probability ~1/16)
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: VanityGenerateOutput = JSON.parse(result.outputJson!);
    expect(output.evmAddress.toLowerCase()).toMatch(/^0xa/);
    expect(output.publicKey).toBeDefined();
    expect(output.attempts).toBeGreaterThan(0);
    expect(output.prefix).toBe('a');
  });

  test('validates prefix format - accepts hex with 0x', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    const args = makeArgs(api, logger, {
      prefix: '0xb',
      maxAttempts: 1000,
      timeout: 5,
    });

    const result = await generateVanity(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: VanityGenerateOutput = JSON.parse(result.outputJson!);
    expect(output.evmAddress.toLowerCase()).toMatch(/^0xb/);
    expect(output.prefix).toBe('b');
  });

  test('fails for non-ECDSA key type', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    const args = makeArgs(api, logger, {
      prefix: 'dead',
      keyType: KeyAlgorithm.ED25519,
    });

    const result = await generateVanity(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('ECDSA');
  });

  test('fails after max attempts with no match', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    // Use an 8-char prefix - statistically impossible to find in 100 attempts
    const args = makeArgs(api, logger, {
      prefix: 'deadbeef',
      maxAttempts: 100,
      timeout: 1,
    });

    const result = await generateVanity(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('No match found');
  });

  test('imports matching key to KMS', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    const args = makeArgs(api, logger, {
      prefix: 'a',
      maxAttempts: 1000,
      timeout: 10,
    });

    const result = await generateVanity(args);

    expect(result.status).toBe(Status.Success);

    // Verify KMS import was called
    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      expect.any(String),
      undefined,
      expect.arrayContaining(['vanity:generated', 'prefix:a']),
    );
  });

  test('outputs correct structure', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    const args = makeArgs(api, logger, {
      prefix: 'c',
      maxAttempts: 1000,
      timeout: 10,
    });

    const result = await generateVanity(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: VanityGenerateOutput = JSON.parse(result.outputJson!);

    // Validate output structure
    expect(output).toHaveProperty('publicKey');
    expect(output).toHaveProperty('evmAddress');
    expect(output).toHaveProperty('attempts');
    expect(output).toHaveProperty('timeElapsed');
    expect(output).toHaveProperty('prefix');
    expect(output).toHaveProperty('privateKeyRef');

    // Validate types
    expect(typeof output.publicKey).toBe('string');
    expect(typeof output.evmAddress).toBe('string');
    expect(typeof output.attempts).toBe('number');
    expect(typeof output.timeElapsed).toBe('number');
    expect(typeof output.prefix).toBe('string');
  });

  test('rejects invalid prefix - too long', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    const args = makeArgs(api, logger, {
      prefix: 'deadbeef12345', // 13 chars, max is 8
    });

    // Should throw during schema validation
    await expect(generateVanity(args)).rejects.toThrow();
  });

  test('rejects invalid prefix - non-hex characters', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    const args = makeArgs(api, logger, {
      prefix: 'ghij', // Not hex
    });

    // Should throw during schema validation
    await expect(generateVanity(args)).rejects.toThrow();
  });

  test('handles case insensitive prefix matching', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    const args = makeArgs(api, logger, {
      prefix: 'A', // Uppercase
      maxAttempts: 1000,
      timeout: 5,
    });

    const result = await generateVanity(args);

    expect(result.status).toBe(Status.Success);
    const output: VanityGenerateOutput = JSON.parse(result.outputJson!);
    // Should match lowercase 'a'
    expect(output.evmAddress.toLowerCase()).toMatch(/^0xa/);
    expect(output.prefix).toBe('a'); // Normalized to lowercase
  });

  test('logs progress during generation', async () => {
    const logger = makeLogger();
    const kms = makeKmsMock();

    const api: Partial<CoreApi> = { kms, logger };

    const args = makeArgs(api, logger, {
      prefix: 'd',
      maxAttempts: 50000,
      timeout: 30,
    });

    await generateVanity(args);

    // Should have logged the search start
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Searching for EVM address'),
    );
  });
});
