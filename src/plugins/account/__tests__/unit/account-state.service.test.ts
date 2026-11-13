import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';

import {
  makeAliasMock,
  makeKmsMock,
  makeLogger,
  makeMirrorMock,
  makeNetworkMock,
  makeReceiptMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { ACCOUNT_CREATE_COMMAND_NAME } from '@/plugins/account/commands/create/handler';
import { ACCOUNT_NAMESPACE } from '@/plugins/account/constants';
import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

import { makeAccountData } from './helpers/mocks';

describe('AccountStateServiceImpl', () => {
  test('saves valid account data in account namespace', () => {
    const logger = makeLogger();
    const state = makeStateMock();
    const service = new AccountStateServiceImpl(
      state,
      logger,
      makeReceiptMock(),
      makeMirrorMock() as HederaMirrornodeService,
      makeAliasMock(),
      makeKmsMock(),
      makeNetworkMock(SupportedNetwork.TESTNET),
    );
    const account = makeAccountData();

    service.saveAccount('testnet:0.0.1234', account);

    expect(state.set).toHaveBeenCalledWith(
      ACCOUNT_NAMESPACE,
      'testnet:0.0.1234',
      account,
    );
  });

  test('throws ValidationError for invalid account data', () => {
    const logger = makeLogger();
    const state = makeStateMock();
    const service = new AccountStateServiceImpl(
      state,
      logger,
      makeReceiptMock(),
      makeMirrorMock() as HederaMirrornodeService,
      makeAliasMock(),
      makeKmsMock(),
      makeNetworkMock(SupportedNetwork.TESTNET),
    );
    const invalidAccount = {
      ...makeAccountData(),
      accountId: 'invalid',
    };

    expect(() =>
      service.saveAccount('testnet:invalid', invalidAccount),
    ).toThrow(ValidationError);
  });

  test('returns null and warns when stored account is invalid', () => {
    const logger = makeLogger();
    const state = makeStateMock();
    state.get.mockReturnValue({
      ...makeAccountData(),
      accountId: 'invalid',
    });
    const service = new AccountStateServiceImpl(
      state,
      logger,
      makeReceiptMock(),
      makeMirrorMock() as HederaMirrornodeService,
      makeAliasMock(),
      makeKmsMock(),
      makeNetworkMock(SupportedNetwork.TESTNET),
    );

    const result = service.getAccount('testnet:invalid');

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  test('lists only valid account records', () => {
    const logger = makeLogger();
    const validAccount = makeAccountData();
    const state = makeStateMock({
      listData: [validAccount, { ...validAccount, accountId: 'invalid' }],
    });
    const service = new AccountStateServiceImpl(
      state,
      logger,
      makeReceiptMock(),
      makeMirrorMock() as HederaMirrornodeService,
      makeAliasMock(),
      makeKmsMock(),
      makeNetworkMock(SupportedNetwork.TESTNET),
    );

    expect(service.listAccounts()).toEqual([validAccount]);
  });

  test('saves accounts created through a batch item with origin "created"', async () => {
    const state = makeStateMock();
    const receipt = makeReceiptMock();
    receipt.getReceipt.mockResolvedValue({
      success: true,
      transactionId: 'mock-tx-id',
      receipt: { status: { status: 'success', transactionId: 'mock-tx-id' } },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
      accountId: '0.0.9999',
    });
    const service = new AccountStateServiceImpl(
      state,
      makeLogger(),
      receipt,
      makeMirrorMock() as HederaMirrornodeService,
      makeAliasMock(),
      makeKmsMock(),
      makeNetworkMock(SupportedNetwork.TESTNET),
    );

    await service.applyAccountCreateFromBatchItem({
      transactionBytes: 'abcdef',
      order: 1,
      command: ACCOUNT_CREATE_COMMAND_NAME,
      keyRefIds: ['kr_batch'],
      normalizedParams: {
        maxAutoAssociations: -1,
        name: 'batch-acc',
        publicKey: 'pub-key',
        keyRefId: 'kr_batch',
        keyType: KeyAlgorithm.ECDSA,
        network: SupportedNetwork.TESTNET,
      },
      transactionId: 'mock-tx-id',
    });

    expect(state.set).toHaveBeenCalledWith(
      ACCOUNT_NAMESPACE,
      'testnet:0.0.9999',
      expect.objectContaining({ accountId: '0.0.9999', origin: 'created' }),
    );
  });
});
