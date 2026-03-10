import '@/core/utils/json-serialize';

import * as fs from 'node:fs';

import { MOCK_TX_ID } from '@/__tests__/mocks/fixtures';
import { makeArgs, makeLogger, makeNetworkMock } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { batchMintNft } from '@/plugins/batch/commands/mint-nft';

jest.mock('node:fs');
const mockFs = fs as jest.Mocked<typeof fs>;

const MOCK_SUPPLY_PUBLIC_KEY = '302a300506032b6570032100' + '8'.repeat(64);

describe('batch plugin - mint-nft command (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  function buildArgs(
    overrides: Record<string, unknown> = {},
    apiOverrides: Record<string, unknown> = {},
  ) {
    const logger = makeLogger();
    const network = makeNetworkMock('testnet');

    const token = {
      createMintTransaction: jest.fn().mockReturnValue('mock-mint-tx'),
      createTransferTransaction: jest.fn(),
      createTokenTransaction: jest.fn(),
      createTokenAssociationTransaction: jest.fn(),
      createNftTransferTransaction: jest.fn(),
    };

    const txExecution = {
      signAndExecuteWith: jest.fn().mockResolvedValue({
        success: true,
        transactionId: MOCK_TX_ID,
        receipt: {
          status: { status: 'SUCCESS' },
          serials: [1n],
        },
      }),
      signAndExecute: jest.fn(),
      signAndExecuteContractCreateFlowWith: jest.fn(),
    };

    const mirror = {
      getTokenInfo: jest.fn().mockResolvedValue({
        type: 'NON_FUNGIBLE_UNIQUE',
        supply_key: { key: MOCK_SUPPLY_PUBLIC_KEY },
        max_supply: '0',
        total_supply: '0',
      }),
      getAccount: jest.fn(),
      getAccountHBarBalance: jest.fn(),
      getAccountTokenBalances: jest.fn(),
      getTopicMessage: jest.fn(),
      getTopicMessages: jest.fn(),
      getNftInfo: jest.fn(),
      getTopicInfo: jest.fn(),
      getTransactionRecord: jest.fn(),
      getContractInfo: jest.fn(),
      getPendingAirdrops: jest.fn(),
      getOutstandingAirdrops: jest.fn(),
      getExchangeRate: jest.fn(),
      postContractCall: jest.fn(),
    };

    const alias = {
      resolve: jest.fn().mockImplementation((name: string, type: string) => {
        if (name === 'my-nft' && type === 'token') {
          return { entityId: '0.0.99999' };
        }
        if (name === 'supply-key' && type === 'account') {
          return {
            entityId: '0.0.300000',
            publicKey: MOCK_SUPPLY_PUBLIC_KEY,
            keyRefId: 'supply-key-ref-id',
          };
        }
        return null;
      }),
      register: jest.fn(),
      resolveOrThrow: jest.fn(),
      resolveByEvmAddress: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      exists: jest.fn(),
      availableOrThrow: jest.fn(),
      clear: jest.fn(),
    };

    const keyResolver = {
      getOrInitKey: jest.fn().mockResolvedValue({
        accountId: '0.0.300000',
        publicKey: MOCK_SUPPLY_PUBLIC_KEY,
        keyRefId: 'supply-key-ref-id',
      }),
      getOrInitKeyWithFallback: jest.fn(),
    };

    const api = {
      network,
      token,
      txExecution,
      mirror,
      alias,
      keyResolver,
      ...apiOverrides,
    };

    return makeArgs(api, logger, {
      file: '/test/nfts.csv',
      token: '0.0.99999',
      supplyKey: 'supply-key',
      dryRun: false,
      ...overrides,
    });
  }

  test('mints NFTs successfully from CSV', async () => {
    const txExecution = {
      signAndExecuteWith: jest
        .fn()
        .mockResolvedValueOnce({
          success: true,
          transactionId: MOCK_TX_ID,
          receipt: { status: { status: 'SUCCESS' }, serials: [1n] },
        })
        .mockResolvedValueOnce({
          success: true,
          transactionId: MOCK_TX_ID,
          receipt: { status: { status: 'SUCCESS' }, serials: [2n] },
        }),
      signAndExecute: jest.fn(),
      signAndExecuteContractCreateFlowWith: jest.fn(),
    };

    mockFs.readFileSync.mockReturnValue(
      'metadata\nhttps://example.com/1.json\nhttps://example.com/2.json',
    );

    const args = buildArgs({}, { txExecution });

    const result = await batchMintNft(args);
    expect(result.status).toBe(Status.Success);

    const output = JSON.parse(result.outputJson!);
    expect(output.total).toBe(2);
    expect(output.succeeded).toBe(2);
    expect(output.failed).toBe(0);
    expect(output.results[0].serialNumber).toBe(1);
    expect(output.results[1].serialNumber).toBe(2);
  });

  test('dry run validates without minting', async () => {
    mockFs.readFileSync.mockReturnValue('metadata\nhttps://example.com/1.json');

    const args = buildArgs({ dryRun: true });

    const result = await batchMintNft(args);
    expect(result.status).toBe(Status.Success);

    const output = JSON.parse(result.outputJson!);
    expect(output.dryRun).toBe(true);
    expect(output.total).toBe(1);

    expect(args.api.txExecution.signAndExecuteWith).not.toHaveBeenCalled();
  });

  test('returns failure when token is not an NFT', async () => {
    mockFs.readFileSync.mockReturnValue('metadata\ntest');

    const mirror = {
      getTokenInfo: jest.fn().mockResolvedValue({
        type: 'FUNGIBLE_COMMON',
        supply_key: { key: MOCK_SUPPLY_PUBLIC_KEY },
      }),
      getAccount: jest.fn(),
      getAccountHBarBalance: jest.fn(),
      getAccountTokenBalances: jest.fn(),
      getTopicMessage: jest.fn(),
      getTopicMessages: jest.fn(),
      getNftInfo: jest.fn(),
      getTopicInfo: jest.fn(),
      getTransactionRecord: jest.fn(),
      getContractInfo: jest.fn(),
      getPendingAirdrops: jest.fn(),
      getOutstandingAirdrops: jest.fn(),
      getExchangeRate: jest.fn(),
      postContractCall: jest.fn(),
    };

    const args = buildArgs({}, { mirror });

    const result = await batchMintNft(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('not an NFT');
  });

  test('returns failure when metadata exceeds 100 bytes', async () => {
    const longMetadata = 'x'.repeat(101);
    mockFs.readFileSync.mockReturnValue(`metadata\n${longMetadata}`);

    const args = buildArgs();

    const result = await batchMintNft(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('exceeds 100 bytes');
  });

  test('returns failure when supply would exceed max', async () => {
    mockFs.readFileSync.mockReturnValue('metadata\ntest1\ntest2');

    const mirror = {
      getTokenInfo: jest.fn().mockResolvedValue({
        type: 'NON_FUNGIBLE_UNIQUE',
        supply_key: { key: MOCK_SUPPLY_PUBLIC_KEY },
        max_supply: '1',
        total_supply: '0',
      }),
      getAccount: jest.fn(),
      getAccountHBarBalance: jest.fn(),
      getAccountTokenBalances: jest.fn(),
      getTopicMessage: jest.fn(),
      getTopicMessages: jest.fn(),
      getNftInfo: jest.fn(),
      getTopicInfo: jest.fn(),
      getTransactionRecord: jest.fn(),
      getContractInfo: jest.fn(),
      getPendingAirdrops: jest.fn(),
      getOutstandingAirdrops: jest.fn(),
      getExchangeRate: jest.fn(),
      postContractCall: jest.fn(),
    };

    const args = buildArgs({}, { mirror });

    const result = await batchMintNft(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Cannot mint');
  });
});
