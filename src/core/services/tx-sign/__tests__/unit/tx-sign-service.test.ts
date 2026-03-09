import type {
  Client,
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';

import { TransactionId } from '@hashgraph/sdk';

import {
  createMockClient,
  createMockContractCreateFlow,
  createMockTransaction,
} from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { TxSignServiceImpl } from '@/core/services/tx-sign/tx-sign-service';

jest.mock('@hashgraph/sdk', () => {
  const actual = jest.requireActual('@hashgraph/sdk');
  return {
    ...actual,
    TransactionId: {
      generate: jest.fn().mockReturnValue('mock-transaction-id'),
    },
  };
});

const MOCK_KEY_REF_1 = 'kr_test1';
const MOCK_KEY_REF_2 = 'kr_test2';
const NETWORK = 'testnet';

const setupService = () => {
  const logger = makeLogger();
  const kms = makeKmsMock();
  const networkService = makeNetworkMock(NETWORK);
  const mockClient = createMockClient();
  kms.createClient.mockReturnValue(mockClient as unknown as Client);

  const service = new TxSignServiceImpl(logger, kms, networkService);
  return { service, logger, kms, networkService, mockClient };
};

describe('TxSignServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sign', () => {
    it('should freeze transaction and return bytes', async () => {
      const { service, mockClient } = setupService();
      const mockTx = createMockTransaction();

      const result = await service.sign(
        mockTx as unknown as HederaTransaction,
        [],
      );

      expect(mockTx.freezeWith).toHaveBeenCalledWith(mockClient);
      expect(mockTx.toBytes).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should not freeze when already frozen', async () => {
      const { service } = setupService();
      const mockTx = createMockTransaction({
        isFrozen: jest.fn().mockReturnValue(true),
      });

      await service.sign(mockTx as unknown as HederaTransaction, []);

      expect(mockTx.freezeWith).not.toHaveBeenCalled();
    });

    it('should sign with provided keyRefIds', async () => {
      const { service, kms } = setupService();
      const mockTx = createMockTransaction();

      await service.sign(mockTx as unknown as HederaTransaction, [
        MOCK_KEY_REF_1,
        MOCK_KEY_REF_2,
      ]);

      expect(kms.signTransaction).toHaveBeenCalledTimes(2);
      expect(kms.signTransaction).toHaveBeenNthCalledWith(
        1,
        mockTx,
        MOCK_KEY_REF_1,
      );
      expect(kms.signTransaction).toHaveBeenNthCalledWith(
        2,
        mockTx,
        MOCK_KEY_REF_2,
      );
    });

    it('should deduplicate keyRefIds', async () => {
      const { service, kms } = setupService();
      const mockTx = createMockTransaction();

      await service.sign(mockTx as unknown as HederaTransaction, [
        MOCK_KEY_REF_1,
        MOCK_KEY_REF_2,
        MOCK_KEY_REF_1,
      ]);

      expect(kms.signTransaction).toHaveBeenCalledTimes(2);
    });

    it('should sign with payer key when payer is set and payer key not in keyRefIds', async () => {
      const { service, kms, networkService } = setupService();
      const mockTx = createMockTransaction();
      networkService.getPayer.mockReturnValue({
        accountId: '0.0.999',
        keyRefId: 'payer-key-ref-id',
        publicKey: 'mock-payer-public-key',
      });

      await service.sign(mockTx as unknown as HederaTransaction, [
        MOCK_KEY_REF_1,
      ]);

      expect(kms.signTransaction).toHaveBeenCalledWith(
        mockTx,
        'payer-key-ref-id',
      );
    });

    it('should not double-sign with payer key when payer key already in keyRefIds', async () => {
      const { service, kms, networkService } = setupService();
      const mockTx = createMockTransaction();
      networkService.getPayer.mockReturnValue({
        accountId: '0.0.999',
        keyRefId: MOCK_KEY_REF_1,
        publicKey: 'mock-payer-public-key',
      });

      await service.sign(mockTx as unknown as HederaTransaction, [
        MOCK_KEY_REF_1,
      ]);

      expect(kms.signTransaction).toHaveBeenCalledTimes(1);
      expect(kms.signTransaction).toHaveBeenCalledWith(mockTx, MOCK_KEY_REF_1);
    });

    it('should set transaction ID when payer is set and tx is not frozen', async () => {
      const { service, networkService } = setupService();
      const mockTx = createMockTransaction({
        setTransactionId: jest.fn(),
      });
      networkService.getPayer.mockReturnValue({
        accountId: '0.0.999',
        keyRefId: 'payer-key-ref-id',
        publicKey: 'mock-payer-public-key',
      });

      await service.sign(mockTx as unknown as HederaTransaction, []);

      expect(TransactionId.generate).toHaveBeenCalled();
    });

    it('should throw StateError when payer is set and transaction is already frozen', async () => {
      const { service, networkService } = setupService();
      const mockTx = createMockTransaction({
        isFrozen: jest.fn().mockReturnValue(true),
      });
      networkService.getPayer.mockReturnValue({
        accountId: '0.0.999',
        keyRefId: 'payer-key-ref-id',
        publicKey: 'mock-payer-public-key',
      });

      await expect(
        service.sign(mockTx as unknown as HederaTransaction, []),
      ).rejects.toThrow(StateError);
    });

    it('should close client after freeze', async () => {
      const { service, mockClient } = setupService();
      const mockTx = createMockTransaction();

      await service.sign(mockTx as unknown as HederaTransaction, []);

      expect(mockClient.close).toHaveBeenCalled();
    });
  });

  describe('signContractCreateFlow', () => {
    it('should sign flow with each keyRefId', () => {
      const { service, kms } = setupService();
      const mockFlow = createMockContractCreateFlow();

      service.signContractCreateFlow(
        mockFlow as unknown as ContractCreateFlow,
        [MOCK_KEY_REF_1, MOCK_KEY_REF_2],
      );

      expect(kms.signContractCreateFlow).toHaveBeenCalledTimes(2);
      expect(kms.signContractCreateFlow).toHaveBeenNthCalledWith(
        1,
        mockFlow,
        MOCK_KEY_REF_1,
      );
      expect(kms.signContractCreateFlow).toHaveBeenNthCalledWith(
        2,
        mockFlow,
        MOCK_KEY_REF_2,
      );
    });

    it('should deduplicate keyRefIds', () => {
      const { service, kms } = setupService();
      const mockFlow = createMockContractCreateFlow();

      service.signContractCreateFlow(
        mockFlow as unknown as ContractCreateFlow,
        [MOCK_KEY_REF_1, MOCK_KEY_REF_2, MOCK_KEY_REF_1],
      );

      expect(kms.signContractCreateFlow).toHaveBeenCalledTimes(2);
    });

    it('should return the same flow object', () => {
      const { service } = setupService();
      const mockFlow = createMockContractCreateFlow();

      const result = service.signContractCreateFlow(
        mockFlow as unknown as ContractCreateFlow,
        [],
      );

      expect(result).toBe(mockFlow);
    });
  });
});
