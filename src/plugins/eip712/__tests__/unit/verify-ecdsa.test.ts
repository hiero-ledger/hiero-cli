import type { CoreApi } from '@/core/core-api/core-api.interface';

import { ValidationError } from '@/core/errors';
import { eip712VerifyEcdsa } from '@/plugins/eip712/commands/verify-ecdsa/handler';

import {
  mockAltSignature65Bytes,
  mockEvmAddress,
  mockPrecomputedHash,
} from './helpers/fixtures';
import { makeApiMock, makeEip712VerifyEcdsaArgs } from './helpers/mocks';

describe('EIP-712 verify-ecdsa command', () => {
  let api: jest.Mocked<CoreApi>;

  beforeEach(() => {
    api = makeApiMock();
  });

  it('sets match=false when recovered signer does not equal expected signer', async () => {
    const args = makeEip712VerifyEcdsaArgs({
      api,
      args: {
        signature: mockAltSignature65Bytes,
        expectedSigner: mockEvmAddress,
      },
    });

    const result = await eip712VerifyEcdsa(args);

    expect((result.result as { match: boolean }).match).toBe(false);
  });

  it('recovers signer address when using a pre-computed hash', async () => {
    const args = makeEip712VerifyEcdsaArgs({
      api,
      args: {
        hash: mockPrecomputedHash,
        signature: mockAltSignature65Bytes,
        domain: undefined,
        types: undefined,
        message: undefined,
      },
    });

    const result = await eip712VerifyEcdsa(args);

    expect(
      (result.result as { recoveredSigner: string }).recoveredSigner,
    ).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('throws when signature is not a valid 65-byte hex', async () => {
    const args = makeEip712VerifyEcdsaArgs({
      api,
      args: { signature: 'not-a-valid-sig' },
    });

    await expect(eip712VerifyEcdsa(args)).rejects.toThrow();
  });

  it('throws when expected-signer is not a valid account reference', async () => {
    const args = makeEip712VerifyEcdsaArgs({
      api,
      args: { expectedSigner: 'invalid@reference!' },
    });

    await expect(eip712VerifyEcdsa(args)).rejects.toThrow();
  });

  it('throws ValidationError when domain is invalid JSON and not a file path', async () => {
    const args = makeEip712VerifyEcdsaArgs({
      api,
      args: { domain: '{ broken :::' },
    });

    await expect(eip712VerifyEcdsa(args)).rejects.toThrow(ValidationError);
  });

  it('throws ZodError when both hash and typed data are provided', async () => {
    const args = makeEip712VerifyEcdsaArgs({
      api,
      args: { hash: mockPrecomputedHash },
    });

    await expect(eip712VerifyEcdsa(args)).rejects.toThrow();
  });

  it('throws ZodError when neither hash nor typed data is provided', async () => {
    const args = makeEip712VerifyEcdsaArgs({
      api,
      args: {
        domain: undefined,
        types: undefined,
        message: undefined,
      },
    });

    await expect(eip712VerifyEcdsa(args)).rejects.toThrow();
  });
});
