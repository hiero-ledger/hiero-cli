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
import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { makeContractErc721ExecuteCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { setApprovalForAllFunctionCall as setApprovalForAllHandler } from '@/plugins/contract-erc721/commands/set-approval-for-all/handler';
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
        approved: true,
      },
    });

    const result = await setApprovalForAllHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc721CallSetApprovalForAllOutput;

    expect(parsed.contractId).toBe(MOCK_CONTRACT_ID);
    expect(parsed.network).toBe(SupportedNetwork.TESTNET);
    expect(parsed.transactionId).toBe(MOCK_TX_ID);

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
        contract: '0.0.9999',
        operator: '0.0.8888',
        gas: 200000,
        approved: false,
      },
    });

    const result = await setApprovalForAllHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(mockAddBool).toHaveBeenCalledWith(false);
  });

  test('uses EVM address directly when operator is EVM address', async () => {
    const evmOperator = MOCK_EVM_ADDRESS_ALT;
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        operator: evmOperator,
        gas: 100000,
        approved: true,
      },
    });

    const result = await setApprovalForAllHandler(args);

    expect(result.status).toBe(Status.Success);
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

    const result = await setApprovalForAllHandler(args);
    expect(result.status).toBe(Status.Success);
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

    const result = await setApprovalForAllHandler(args);
    expect(result.status).toBe(Status.Success);
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

    const result = await setApprovalForAllHandler(args);
    expect(result.status).toBe(Status.Success);
    expect(mockAddBool).toHaveBeenCalledWith(false);
  });

  test('returns failure when signAndExecute returns success false', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        operator: 'bob',
        gas: 100000,
        approved: true,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    const result = await setApprovalForAllHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call setApprovalForAll function: FAILURE',
    );
  });

  test('returns failure when signAndExecute throws', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        operator: 'bob',
        gas: 100000,
        approved: true,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    const result = await setApprovalForAllHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call setApprovalForAll function: network error',
    );
  });

  test('returns failure when contract not found', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'missing-contract',
        operator: 'bob',
        gas: 100000,
        approved: true,
      },
    });

    (
      args.api.identityResolution.resolveContract as jest.Mock
    ).mockRejectedValue(
      new Error(
        `Alias "missing-contract" for contract on network "${SupportedNetwork.TESTNET}" not found`,
      ),
    );

    const result = await setApprovalForAllHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call setApprovalForAll function',
    );
    expect(result.errorMessage).toContain('not found');
  });

  test('returns failure when operator has no evmAddress', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        operator: 'bob',
        gas: 100000,
        approved: true,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: MOCK_ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      },
    );

    const result = await setApprovalForAllHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
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
    }).toThrow('approved must be "true" or "false"');
  });
});
