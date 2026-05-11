import type { CoreApi } from '@/core/core-api/core-api.interface';

import { ValidationError } from '@/core/errors';
import { eip712Sign } from '@/plugins/eip712/commands/sign/handler';

import {
  mockEcdsaKmsRecord,
  mockEd25519KmsRecord,
  mockSignature65Bytes,
} from './helpers/fixtures';
import {
  makeApiMock,
  makeEip712SignArgs,
  makeKmsMock,
  makeSignerMock,
} from './helpers/mocks';

describe('EIP-712 sign command', () => {
  let api: jest.Mocked<CoreApi>;

  beforeEach(() => {
    api = makeApiMock({
      kms: makeKmsMock({
        get: jest.fn().mockReturnValue(mockEcdsaKmsRecord),
        getSignerHandle: jest.fn().mockReturnValue(
          makeSignerMock({
            signWithWallet: jest.fn().mockResolvedValue(mockSignature65Bytes),
          }),
        ),
      }),
    });
  });

  it('returns signature components for valid ECDSA key and typed data', async () => {
    const args = makeEip712SignArgs({ api });

    const result = await eip712Sign(args);

    expect(result.result).toMatchObject({
      signature: mockSignature65Bytes,
      r: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
      s: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
      v: expect.any(Number),
      signerEvm: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
    });
  });

  it('throws ValidationError when key reference is not found in KMS', async () => {
    api = makeApiMock({
      kms: makeKmsMock({ get: jest.fn().mockReturnValue(undefined) }),
    });
    const args = makeEip712SignArgs({ api });

    await expect(eip712Sign(args)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when key algorithm is not ECDSA', async () => {
    api = makeApiMock({
      kms: makeKmsMock({
        get: jest.fn().mockReturnValue(mockEd25519KmsRecord),
      }),
    });
    const args = makeEip712SignArgs({ api });

    await expect(eip712Sign(args)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when domain is invalid JSON and not a file path', async () => {
    const args = makeEip712SignArgs({ api, args: { domain: '{ broken :::' } });

    await expect(eip712Sign(args)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when domain file does not exist', async () => {
    const args = makeEip712SignArgs({
      api,
      args: { domain: '/tmp/nonexistent-eip712-domain.json' },
    });

    await expect(eip712Sign(args)).rejects.toThrow(ValidationError);
  });
});
