import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallSetApprovalForAllOutput } from '@/plugins/contract-erc721/commands/set-approval-for-all/output';

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
import { setApprovalForAllFunctionCall } from '@/plugins/contract-erc721/commands/set-approval-for-all/handler';
import { ContractErc721CallSetApprovalForAllInputSchema } from '@/plugins/contract-erc721/commands/set-approval-for-all/input';

const mockAddAddress = jest.fn().mockReturnThis();
const mockAddBool = jest.fn().mockReturnThis();

jest.mock('@hashgraph/sdk', () => ({
  ContractFunctionParameters: jest.fn(() => ({
    addAddress: mockAddAddress,
    addBool: mockAddBool,
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

describe('contract-erc721 plugin - setApprovalForAll command (unit)', () => {
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

  test('calls ERC-721 setApprovalForAll successfully with approved true and returns expected output', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        operator: 'bob',
        gas: 100000,
        approved: 'true',
      },
    });

    const result = await setApprovalForAllFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallSetApprovalForAllOutput;
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
    expect(mockAddBool).toHaveBeenCalledWith(true);
    expect(args.api.contract.contractExecuteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        gas: 100000,
        functionName: 'setApprovalForAll',
      }),
    );
    expect(args.api.txExecution.signAndExecute).toHaveBeenCalledWith({});
  });

  test('calls ERC-721 setApprovalForAll with approved false', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID_ALT,
        operator: MOCK_ACCOUNT_ID_TO,
        gas: 200000,
        approved: 'false',
      },
    });

    const result = await setApprovalForAllFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(mockAddBool).toHaveBeenCalledWith(false);
  });

  test('uses EVM address directly when operator is EVM address', async () => {
    const evmOperator = MOCK_EVM_ADDRESS_ALT;
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        operator: evmOperator,
        gas: 100000,
        approved: 'true',
      },
    });

    const result = await setApprovalForAllFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalled();
    expect(mockAddAddress).toHaveBeenCalledWith(evmOperator);
  });

  test('parses approved string "true" correctly', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        operator: 'bob',
        gas: 100000,
        approved: 'true',
      },
    });

    const result = await setApprovalForAllFunctionCall(args);
    expect(result.result).toBeDefined();
    expect(mockAddBool).toHaveBeenCalledWith(true);
  });

  test('parses approved string "True" (case-insensitive) correctly', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        operator: 'bob',
        gas: 100000,
        approved: 'True',
      },
    });

    const result = await setApprovalForAllFunctionCall(args);
    expect(result.result).toBeDefined();
    expect(mockAddBool).toHaveBeenCalledWith(true);
  });

  test('parses approved string "false" correctly', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        operator: 'bob',
        gas: 100000,
        approved: 'false',
      },
    });

    const result = await setApprovalForAllFunctionCall(args);
    expect(result.result).toBeDefined();
    expect(mockAddBool).toHaveBeenCalledWith(false);
  });

  test('throws TransactionError when signAndExecute returns success false', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        operator: 'bob',
        gas: 100000,
        approved: 'true',
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    await expect(setApprovalForAllFunctionCall(args)).rejects.toThrow(
      TransactionError,
    );
    await expect(setApprovalForAllFunctionCall(args)).rejects.toThrow(
      'Failed to call setApprovalForAll function: FAILURE',
    );
  });

  test('propagates error when signAndExecute throws', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        operator: 'bob',
        gas: 100000,
        approved: 'true',
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    await expect(setApprovalForAllFunctionCall(args)).rejects.toThrow(
      'network error',
    );
  });

  test('propagates error when contract not found', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'missing-contract',
        operator: 'bob',
        gas: 100000,
        approved: 'true',
      },
    });

    (
      args.api.identityResolution.resolveContract as jest.Mock
    ).mockRejectedValue(
      new Error(
        `Alias "missing-contract" for contract on network "${SupportedNetwork.TESTNET}" not found`,
      ),
    );

    await expect(setApprovalForAllFunctionCall(args)).rejects.toThrow(
      'not found',
    );
  });

  test('throws NotFoundError when operator has no evmAddress', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        operator: 'bob',
        gas: 100000,
        approved: 'true',
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: MOCK_ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      },
    );

    await expect(setApprovalForAllFunctionCall(args)).rejects.toThrow(
      NotFoundError,
    );
    await expect(setApprovalForAllFunctionCall(args)).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallSetApprovalForAllInputSchema.parse({
        operator: 'bob',
        gas: 100000,
        approved: 'true',
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when operator is missing', () => {
    expect(() => {
      ContractErc721CallSetApprovalForAllInputSchema.parse({
        contract: 'my-contract',
        gas: 100000,
        approved: 'true',
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when approved is missing', () => {
    expect(() => {
      ContractErc721CallSetApprovalForAllInputSchema.parse({
        contract: 'my-contract',
        operator: 'bob',
        gas: 100000,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when approved has invalid value', () => {
    expect(() => {
      ContractErc721CallSetApprovalForAllInputSchema.parse({
        contract: 'my-contract',
        operator: 'bob',
        gas: 100000,
        approved: 'yes',
      });
    }).toThrow();
  });
});
