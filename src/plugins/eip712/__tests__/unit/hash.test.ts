import { ValidationError } from '@/core/errors';
import { eip712Hash } from '@/plugins/eip712/commands/hash/handler';

import { makeApiMock, makeCommandArgs } from './helpers/mocks';

const DOMAIN = '{"name":"TestApp","version":"1","chainId":296}';
const TYPES =
  '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}';
const MESSAGE =
  '{"from":"0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826","contents":"Hello!"}';

const makeHashArgs = (overrides: Record<string, unknown> = {}) =>
  makeCommandArgs({
    api: makeApiMock(),
    args: { domain: DOMAIN, types: TYPES, message: MESSAGE, ...overrides },
  });

describe('EIP-712 hash command', () => {
  it('returns a 0x-prefixed 32-byte hash for valid typed data', async () => {
    const result = await eip712Hash(makeHashArgs());

    expect((result.result as { hash: string }).hash).toMatch(
      /^0x[0-9a-fA-F]{64}$/,
    );
  });

  it('returns the same hash for the same inputs', async () => {
    const a = await eip712Hash(makeHashArgs());
    const b = await eip712Hash(makeHashArgs());

    expect((a.result as { hash: string }).hash).toBe(
      (b.result as { hash: string }).hash,
    );
  });

  it('returns a different hash when the message changes', async () => {
    const a = await eip712Hash(makeHashArgs());
    const b = await eip712Hash(
      makeHashArgs({
        message:
          '{"from":"0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826","contents":"Goodbye!"}',
      }),
    );

    expect((a.result as { hash: string }).hash).not.toBe(
      (b.result as { hash: string }).hash,
    );
  });

  it('throws ValidationError when domain is invalid JSON', async () => {
    await expect(
      eip712Hash(makeHashArgs({ domain: '{ broken :::' })),
    ).rejects.toThrow(ValidationError);
  });

  it('throws when domain is missing', async () => {
    await expect(
      eip712Hash(
        makeCommandArgs({
          api: makeApiMock(),
          args: { types: TYPES, message: MESSAGE },
        }),
      ),
    ).rejects.toThrow();
  });

  it('throws when types is missing', async () => {
    await expect(
      eip712Hash(
        makeCommandArgs({
          api: makeApiMock(),
          args: { domain: DOMAIN, message: MESSAGE },
        }),
      ),
    ).rejects.toThrow();
  });

  it('throws when message is missing', async () => {
    await expect(
      eip712Hash(
        makeCommandArgs({
          api: makeApiMock(),
          args: { domain: DOMAIN, types: TYPES },
        }),
      ),
    ).rejects.toThrow();
  });
});
