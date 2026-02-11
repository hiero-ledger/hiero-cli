import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallMintOutput } from '@/plugins/contract-erc721/commands/mint/output';

import { ZodError } from 'zod';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_EVM_ADDRESS_ALT,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { makeContractErc721ExecuteCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { mintFunctionCall as mintHandler } from '@/plugins/contract-erc721/commands/mint/handler';
import { ContractErc721CallMintInputSchema } from '@/plugins/contract-erc721/commands/mint/input';

const mockAddAddress = jest.fn().mockReturnThis();
const mockAddUint256 = jest.fn().mockReturnThis();

jest.mock('@hashgraph/sdk', () => ({
  ContractFunctionParameters: jest.fn(() => ({
    addAddress: mockAddAddress,
    addUint256: mockAddUint256,
  })),
  ContractId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => 'a'.repeat(40)),
    })),
  },
  TokenType: {
    NonFungibleUnique: 1,
    FungibleCommon: 0,
  },
}));

describe('contract-erc721 plugin - mint command (unit)', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      identityResolution: {
        resolveContract: jest.fn().mockResolvedValue({
          contractId: MOCK_CONTRACT_ID,
          evmAddress: MOCK_EVM_ADDRESS,
        }),
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: MOCK_ACCOUNT_ID,
          accountPublicKey: 'pub-key',
          evmAddress: MOCK_EVM_ADDRESS,
        }),
        resolveReferenceToEntityOrEvmAddress: jest.fn(),
      },
      contract: {
        contractExecuteTransaction: jest.fn().mockReturnValue({
          transaction: {},
        }),
      },
      txExecution: {
        signAndExecute: jest.fn().mockResolvedValue({
          success: true,
          transactionId: MOCK_TX_ID,
        }),
      },
    }).api;
  });

  test('calls ERC-721 mint successfully and returns expected output', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        to: 'bob',
        gas: 100000,
        tokenId: 42,
      },
    });

    const result = await mintHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc721CallMintOutput;

    expect(parsed.contractId).toBe(MOCK_CONTRACT_ID);
    expect(parsed.network).toBe('testnet');
    expect(parsed.transactionId).toBe(MOCK_TX_ID);

    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: 'some-contract',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'bob',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(mockAddAddress).toHaveBeenCalledWith(MOCK_EVM_ADDRESS);
    expect(mockAddUint256).toHaveBeenCalledWith(42);
    expect(args.api.contract.contractExecuteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        gas: 100000,
        functionName: 'mint',
      }),
    );
    expect(args.api.txExecution.signAndExecute).toHaveBeenCalledWith({});
  });

  test('uses entity ID when contract is entity ID (not alias)', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.9999',
        to: '0.0.8888',
        gas: 200000,
        tokenId: 1,
      },
    });

    const result = await mintHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: '0.0.9999',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: '0.0.8888',
      type: expect.any(String),
      network: 'testnet',
    });
  });

  test('uses EVM address directly when to is EVM address', async () => {
    const evmTo = MOCK_EVM_ADDRESS_ALT;
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        to: evmTo,
        gas: 100000,
        tokenId: 100,
      },
    });

    const result = await mintHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalled();
    expect(mockAddAddress).toHaveBeenCalledWith(evmTo);
    expect(mockAddUint256).toHaveBeenCalledWith(100);
  });

  test('returns failure when signAndExecute returns success false', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        tokenId: 1,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    const result = await mintHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call mint function: FAILURE',
    );
  });

  test('returns failure when signAndExecute throws', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        tokenId: 1,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    const result = await mintHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call mint function: network error',
    );
  });

  test('returns failure when contract not found', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'missing-contract',
        to: 'bob',
        gas: 100000,
        tokenId: 1,
      },
    });

    (
      args.api.identityResolution.resolveContract as jest.Mock
    ).mockRejectedValue(
      new Error(
        'Alias "missing-contract" for contract on network "testnet" not found',
      ),
    );

    const result = await mintHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to call mint function');
    expect(result.errorMessage).toContain('not found');
  });

  test('returns failure when to has no evmAddress', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        to: 'bob',
        gas: 100000,
        tokenId: 1,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: MOCK_ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      },
    );

    const result = await mintHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallMintInputSchema.parse({
        to: 'bob',
        gas: 100000,
        tokenId: 1,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when to is missing', () => {
    expect(() => {
      ContractErc721CallMintInputSchema.parse({
        contract: 'my-contract',
        gas: 100000,
        tokenId: 1,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is missing', () => {
    expect(() => {
      ContractErc721CallMintInputSchema.parse({
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is negative', () => {
    expect(() => {
      ContractErc721CallMintInputSchema.parse({
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        tokenId: -1,
      });
    }).toThrow(ZodError);
  });
});
