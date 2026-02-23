import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallApproveOutput } from '@/plugins/contract-erc721/commands/approve/output';

import { ZodError } from 'zod';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_EVM_ADDRESS_ALT,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError, TransactionError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  makeContractErc721ExecuteCommandArgs,
  MOCK_ACCOUNT_ID_TO,
  MOCK_CONTRACT_ID_ALT,
} from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { approveFunctionCall } from '@/plugins/contract-erc721/commands/approve/handler';
import { ContractErc721CallApproveInputSchema } from '@/plugins/contract-erc721/commands/approve/input';

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

describe('contract-erc721 plugin - approve command (unit)', () => {
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

  test('calls ERC-721 approve successfully and returns expected output', async () => {
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

    const result = await approveFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallApproveOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.transactionId).toBe(MOCK_TX_ID);

    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: 'some-contract',
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'bob',
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(mockAddAddress).toHaveBeenCalledWith(MOCK_EVM_ADDRESS);
    expect(mockAddUint256).toHaveBeenCalledWith(42);
    expect(args.api.contract.contractExecuteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        gas: 100000,
        functionName: 'approve',
      }),
    );
    expect(args.api.txExecution.signAndExecute).toHaveBeenCalledWith({});
  });

  test('uses entity ID when contract is entity ID (not alias)', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID_ALT,
        to: MOCK_ACCOUNT_ID_TO,
        gas: 200000,
        tokenId: 1,
      },
    });

    const result = await approveFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: MOCK_CONTRACT_ID_ALT,
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: MOCK_ACCOUNT_ID_TO,
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
  });

  test('uses EVM address directly when to is EVM address', async () => {
    const evmTo = MOCK_EVM_ADDRESS_ALT;
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        to: evmTo,
        gas: 100000,
        tokenId: 100,
      },
    });

    const result = await approveFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalled();
    expect(mockAddAddress).toHaveBeenCalledWith(evmTo);
    expect(mockAddUint256).toHaveBeenCalledWith(100);
  });

  test('throws TransactionError when signAndExecute returns success false', async () => {
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

    await expect(approveFunctionCall(args)).rejects.toThrow(TransactionError);
    await expect(approveFunctionCall(args)).rejects.toThrow(
      'Failed to call approve function: FAILURE',
    );
  });

  test('propagates error when signAndExecute throws', async () => {
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

    await expect(approveFunctionCall(args)).rejects.toThrow('network error');
  });

  test('propagates error when contract not found', async () => {
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
        `Alias "missing-contract" for contract on network "${SupportedNetwork.TESTNET}" not found`,
      ),
    );

    await expect(approveFunctionCall(args)).rejects.toThrow('not found');
  });

  test('throws NotFoundError when to has no evmAddress', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
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

    await expect(approveFunctionCall(args)).rejects.toThrow(NotFoundError);
    await expect(approveFunctionCall(args)).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallApproveInputSchema.parse({
        to: 'bob',
        gas: 100000,
        tokenId: 1,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when to is missing', () => {
    expect(() => {
      ContractErc721CallApproveInputSchema.parse({
        contract: 'my-contract',
        gas: 100000,
        tokenId: 1,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is missing', () => {
    expect(() => {
      ContractErc721CallApproveInputSchema.parse({
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is negative', () => {
    expect(() => {
      ContractErc721CallApproveInputSchema.parse({
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        tokenId: -1,
      });
    }).toThrow(ZodError);
  });
});
