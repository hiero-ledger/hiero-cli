import type { CoreApi } from '@/core/core-api/core-api.interface';

import { ValidationError } from '@/core/errors';
import { eip712Verify } from '@/plugins/eip712/commands/verify/handler';

import { mockAltSignature65Bytes, mockEvmAddress } from './helpers/fixtures';
import { makeApiMock, makeEip712VerifyArgs } from './helpers/mocks';

describe('EIP-712 verify command', () => {
  let api: jest.Mocked<CoreApi>;

  beforeEach(() => {
    api = makeApiMock();
  });

  it('sets match=false when recovered signer does not equal expected signer', async () => {
    const args = makeEip712VerifyArgs({
      api,
      args: {
        signature: mockAltSignature65Bytes,
        expectedSigner: mockEvmAddress,
      },
    });

    const result = await eip712Verify(args);

    expect((result.result as { match: boolean }).match).toBe(false);
  });

  it('throws when signature is not a valid 65-byte hex', async () => {
    const args = makeEip712VerifyArgs({
      api,
      args: { signature: 'not-a-valid-sig' },
    });

    await expect(eip712Verify(args)).rejects.toThrow();
  });

  it('throws when expected-signer is not a valid account reference', async () => {
    const args = makeEip712VerifyArgs({
      api,
      args: { expectedSigner: 'invalid@reference!' },
    });

    await expect(eip712Verify(args)).rejects.toThrow();
  });

  it('throws ValidationError when domain is invalid JSON and not a file path', async () => {
    const args = makeEip712VerifyArgs({
      api,
      args: { domain: '{ broken :::' },
    });

    await expect(eip712Verify(args)).rejects.toThrow(ValidationError);
  });
});
