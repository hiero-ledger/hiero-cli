import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';

import { MOCK_ACCOUNT_ID, MOCK_EVM_ADDRESS } from '@/__tests__/mocks/fixtures';
import { NotFoundError, StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';

const NETWORK = SupportedNetwork.TESTNET;
const ACCOUNT_ID = MOCK_ACCOUNT_ID;

const makeService = (resolveAccount: jest.Mock): TokenReferenceServiceImpl => {
  const identityResolution = {
    resolveAccount,
    resolveContract: jest.fn(),
    resolveReferenceToEntityOrEvmAddress: jest.fn(),
  } as unknown as IdentityResolutionService;
  return new TokenReferenceServiceImpl(identityResolution);
};

describe('TokenReferenceServiceImpl.resolveDestinationAccount', () => {
  test('returns null when account is undefined', async () => {
    const service = makeService(jest.fn());
    await expect(
      service.resolveDestinationAccount(undefined, NETWORK),
    ).resolves.toBeNull();
  });

  test('returns accountId for a resolvable entity', async () => {
    const resolveAccount = jest
      .fn()
      .mockResolvedValue({ accountId: ACCOUNT_ID, accountPublicKey: '' });
    const service = makeService(resolveAccount);

    await expect(
      service.resolveDestinationAccount(ACCOUNT_ID, NETWORK),
    ).resolves.toEqual({ accountId: ACCOUNT_ID });
  });

  test('falls back to EVM address when EVM account not found', async () => {
    const resolveAccount = jest
      .fn()
      .mockRejectedValue(new NotFoundError('Account not found'));
    const service = makeService(resolveAccount);

    await expect(
      service.resolveDestinationAccount(MOCK_EVM_ADDRESS, NETWORK),
    ).resolves.toEqual({ evmAddress: MOCK_EVM_ADDRESS });
  });

  test('rethrows NotFoundError for non-EVM references (alias)', async () => {
    const resolveAccount = jest
      .fn()
      .mockRejectedValue(new NotFoundError('Account not found'));
    const service = makeService(resolveAccount);

    await expect(
      service.resolveDestinationAccount('unknown-alias', NETWORK),
    ).rejects.toThrow(NotFoundError);
  });

  test('rethrows non-NotFoundError errors for EVM references', async () => {
    const resolveAccount = jest.fn().mockRejectedValue(new StateError('boom'));
    const service = makeService(resolveAccount);

    await expect(
      service.resolveDestinationAccount(MOCK_EVM_ADDRESS, NETWORK),
    ).rejects.toThrow(StateError);
  });
});
