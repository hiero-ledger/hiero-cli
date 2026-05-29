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
import { SupportedNetwork } from '@/core/types/shared.types';
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
});
