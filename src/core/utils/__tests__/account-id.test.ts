import { AccountId } from '@hiero-ledger/sdk';

import { MOCK_EVM_ADDRESS } from '@/__tests__/mocks/fixtures';
import { toSdkAccountId } from '@/core/utils/account-id';

describe('toSdkAccountId', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('builds AccountId from EVM address via fromEvmAddress', () => {
    const fromEvmAddress = jest.spyOn(AccountId, 'fromEvmAddress');
    const fromString = jest.spyOn(AccountId, 'fromString');

    const result = toSdkAccountId(MOCK_EVM_ADDRESS);

    expect(fromEvmAddress).toHaveBeenCalledWith(0, 0, MOCK_EVM_ADDRESS);
    expect(fromString).not.toHaveBeenCalled();
    expect(result.evmAddress).not.toBeNull();
  });

  test('builds AccountId from Hedera account ID via fromString', () => {
    const fromEvmAddress = jest.spyOn(AccountId, 'fromEvmAddress');
    const fromString = jest.spyOn(AccountId, 'fromString');

    const result = toSdkAccountId('0.0.1001');

    expect(fromString).toHaveBeenCalledWith('0.0.1001');
    expect(fromEvmAddress).not.toHaveBeenCalled();
    expect(result.num.toString()).toBe('1001');
    expect(result.evmAddress).toBeNull();
  });
});
