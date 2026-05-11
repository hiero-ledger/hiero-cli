import type { AliasRecord } from '@/core/services/alias/alias-service.interface';

import {
  makeAliasMock,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { AccountCleanupServiceImpl } from '@/plugins/account/services/account-cleanup.service';

import { makeAccountData, makeAccountStateServiceMock } from './helpers/mocks';

describe('AccountCleanupServiceImpl', () => {
  test('removes account state and aliases for the deleted account', () => {
    const logger = makeLogger();
    const alias = makeAliasMock();
    const accountState = makeAccountStateServiceMock();
    const kms = makeKmsMock();
    const network = makeNetworkMock(SupportedNetwork.TESTNET);
    const records: AliasRecord[] = [
      {
        alias: 'acc1',
        type: AliasType.Account,
        network: SupportedNetwork.TESTNET,
        entityId: '0.0.1234',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    alias.list.mockReturnValue(records);
    const service = new AccountCleanupServiceImpl(
      accountState,
      alias,
      kms,
      network,
      logger,
    );

    const removedAliases = service.removeAccountFromLocalState(
      { accountId: '0.0.1234' },
      SupportedNetwork.TESTNET,
    );

    expect(alias.remove).toHaveBeenCalledWith('acc1', SupportedNetwork.TESTNET);
    expect(accountState.deleteAccount).toHaveBeenCalledWith('testnet:0.0.1234');
    expect(removedAliases).toEqual(['acc1 (testnet)']);
  });

  test('keeps KMS credential when another account still uses it', () => {
    const logger = makeLogger();
    const alias = makeAliasMock();
    const accountState = makeAccountStateServiceMock({
      listAccounts: jest
        .fn()
        .mockReturnValue([
          makeAccountData({ accountId: '0.0.2222', keyRefId: 'kr_same' }),
        ]),
    });
    const kms = makeKmsMock();
    const network = makeNetworkMock(SupportedNetwork.TESTNET);
    const service = new AccountCleanupServiceImpl(
      accountState,
      alias,
      kms,
      network,
      logger,
    );

    service.removeKmsCredentialIfUnusedAfterAccountRemoved({
      keyRefId: 'kr_same',
    });

    expect(kms.remove).not.toHaveBeenCalled();
  });

  test('removes unused KMS credential when it is not operator key', () => {
    const logger = makeLogger();
    const alias = makeAliasMock();
    const accountState = makeAccountStateServiceMock({
      listAccounts: jest.fn().mockReturnValue([]),
    });
    const kms = makeKmsMock();
    const network = makeNetworkMock(SupportedNetwork.TESTNET);
    const service = new AccountCleanupServiceImpl(
      accountState,
      alias,
      kms,
      network,
      logger,
    );

    service.removeKmsCredentialIfUnusedAfterAccountRemoved({
      keyRefId: 'kr_unused',
    });

    expect(kms.remove).toHaveBeenCalledWith('kr_unused');
  });
});
