import type { AccountId, TransferTransaction } from '@hiero-ledger/sdk';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_TO,
  MOCK_EVM_ADDRESS,
  MOCK_EVM_ADDRESS_RAW,
  MOCK_TOKEN_ID,
} from '@/__tests__/mocks/fixtures';
import {
  FtTransferEntry,
  HbarTransferEntry,
  NftTransferEntry,
} from '@/core/services/transfer';

const FROM = MOCK_ACCOUNT_ID;
const TO_ACCOUNT_ID = MOCK_ACCOUNT_ID_TO;
const TOKEN_ID = MOCK_TOKEN_ID;
const TO_ACCOUNT_NUM = TO_ACCOUNT_ID.split('.').pop() as string;

const makeTx = () =>
  ({
    addHbarTransfer: jest.fn(),
    addTokenTransfer: jest.fn(),
    addNftTransfer: jest.fn(),
  }) as unknown as jest.Mocked<TransferTransaction>;

describe('transfer entries - EVM-aware recipient', () => {
  describe('HbarTransferEntry', () => {
    test('builds EVM recipient as alias (evmAddress set, num 0)', () => {
      const tx = makeTx();
      new HbarTransferEntry(FROM, MOCK_EVM_ADDRESS, 100n).apply(tx);

      const recipient = tx.addHbarTransfer.mock.calls[1][0] as AccountId;
      expect(recipient.num.toNumber()).toBe(0);
      expect(recipient.evmAddress).not.toBeNull();
      expect(recipient.toSolidityAddress()).toBe(MOCK_EVM_ADDRESS_RAW);
    });

    test('builds account-id recipient via fromString', () => {
      const tx = makeTx();
      new HbarTransferEntry(FROM, TO_ACCOUNT_ID, 100n).apply(tx);

      const recipient = tx.addHbarTransfer.mock.calls[1][0] as AccountId;
      expect(recipient.evmAddress).toBeNull();
      expect(recipient.num.toString()).toBe(TO_ACCOUNT_NUM);
    });
  });

  describe('FtTransferEntry', () => {
    test('builds EVM recipient as alias', () => {
      const tx = makeTx();
      new FtTransferEntry(FROM, MOCK_EVM_ADDRESS, TOKEN_ID, 100n).apply(tx);

      const recipient = tx.addTokenTransfer.mock.calls[1][1] as AccountId;
      expect(recipient.num.toNumber()).toBe(0);
      expect(recipient.evmAddress).not.toBeNull();
      expect(recipient.toSolidityAddress()).toBe(MOCK_EVM_ADDRESS_RAW);
    });

    test('builds account-id recipient via fromString', () => {
      const tx = makeTx();
      new FtTransferEntry(FROM, TO_ACCOUNT_ID, TOKEN_ID, 100n).apply(tx);

      const recipient = tx.addTokenTransfer.mock.calls[1][1] as AccountId;
      expect(recipient.evmAddress).toBeNull();
      expect(recipient.num.toString()).toBe(TO_ACCOUNT_NUM);
    });
  });

  describe('NftTransferEntry', () => {
    test('builds EVM recipient as alias', () => {
      const tx = makeTx();
      new NftTransferEntry(FROM, MOCK_EVM_ADDRESS, TOKEN_ID, 1).apply(tx);

      const recipient = tx.addNftTransfer.mock.calls[0][2] as AccountId;
      expect(recipient.num.toNumber()).toBe(0);
      expect(recipient.evmAddress).not.toBeNull();
      expect(recipient.toSolidityAddress()).toBe(MOCK_EVM_ADDRESS_RAW);
    });

    test('builds account-id recipient via fromString', () => {
      const tx = makeTx();
      new NftTransferEntry(FROM, TO_ACCOUNT_ID, TOKEN_ID, 1).apply(tx);

      const recipient = tx.addNftTransfer.mock.calls[0][2] as AccountId;
      expect(recipient.evmAddress).toBeNull();
      expect(recipient.num.toString()).toBe(TO_ACCOUNT_NUM);
    });
  });
});
