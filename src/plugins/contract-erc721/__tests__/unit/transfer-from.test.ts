import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallTransferFromOutput } from '@/plugins/contract-erc721/commands/transfer-from/output';

import { ZodError } from 'zod';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_EVM_ADDRESS_ALT,
  MOCK_EVM_ADDRESS_ALT_2,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { NotFoundError, TransactionError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  makeContractErc721ExecuteCommandArgs,
  MOCK_ACCOUNT_ID_FROM,
  MOCK_ACCOUNT_ID_TO,
  MOCK_CONTRACT_ID_ALT,
} from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
} from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { transferFromFunctionCall } from '@/plugins/contract-erc721/commands/transfer-from/handler';
import { ContractErc721CallTransferFromInputSchema } from '@/plugins/contract-erc721/commands/transfer-from/input';

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

describe('contract-erc721 plugin - transferFrom command (unit)', () => {
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

  test('calls ERC-721 transferFrom successfully and returns expected output', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        tokenId: 100,
      },
    });

    const result = await transferFromFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallTransferFromOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.transactionId).toBe(MOCK_TX_ID);

    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: 'my-contract',
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'alice',
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'bob',
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, MOCK_EVM_ADDRESS);
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, MOCK_EVM_ADDRESS);
    expect(mockAddUint256).toHaveBeenCalledWith(100);
    expect(args.api.contract.contractExecuteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        gas: 100000,
        functionName: 'transferFrom',
      }),
    );
    expect(args.api.txExecution.signAndExecute).toHaveBeenCalledWith({});
  });

  test('uses entity ID when contract, from and to are entity IDs', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID_ALT,
        from: MOCK_ACCOUNT_ID_FROM,
        to: MOCK_ACCOUNT_ID_TO,
        gas: 7210000,
        tokenId: 50,
      },
    });

    const result = await transferFromFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: MOCK_CONTRACT_ID_ALT,
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: MOCK_ACCOUNT_ID_FROM,
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: MOCK_ACCOUNT_ID_TO,
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
  });

  test('uses EVM address directly when from is EVM address', async () => {
    const fromEvm = MOCK_EVM_ADDRESS_ALT;
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        from: fromEvm,
        to: 'bob',
        gas: 100000,
        tokenId: 1,
      },
    });

    const result = await transferFromFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalledWith(
      expect.objectContaining({ accountReference: fromEvm }),
    );
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, fromEvm);
  });

  test('uses EVM address directly when to is EVM address', async () => {
    const toEvm = MOCK_EVM_ADDRESS_ALT_2;
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        from: 'alice',
        to: toEvm,
        gas: 100000,
        tokenId: 1,
      },
    });

    const result = await transferFromFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalledWith(
      expect.objectContaining({ accountReference: toEvm }),
    );
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, toEvm);
  });

  test('throws TransactionError when signAndExecute returns success false', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        tokenId: 100,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    await expect(transferFromFunctionCall(args)).rejects.toThrow(
      TransactionError,
    );
    await expect(transferFromFunctionCall(args)).rejects.toThrow(
      'Failed to call transferFrom function: FAILURE',
    );
  });

  test('propagates error when signAndExecute throws', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        tokenId: 100,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    await expect(transferFromFunctionCall(args)).rejects.toThrow(
      'network error',
    );
  });

  test('propagates error when alias not found for contract', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'missing-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        tokenId: 100,
      },
    });

    (
      args.api.identityResolution.resolveContract as jest.Mock
    ).mockRejectedValue(
      new Error(
        `Alias "missing-contract" for contract on network "${SupportedNetwork.TESTNET}" not found`,
      ),
    );

    await expect(transferFromFunctionCall(args)).rejects.toThrow('not found');
  });

  test('throws NotFoundError when resolveAccount for from has no evmAddress', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        from: 'alice',
        to: 'bob',
        gas: 100000,
        tokenId: 100,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      })
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: MOCK_EVM_ADDRESS,
      });

    const promise = transferFromFunctionCall(args);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
    await expect(promise).rejects.toThrow('alice');
  });

  test('throws NotFoundError when resolveAccount for to has no evmAddress', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        from: 'alice',
        to: 'bob',
        gas: 100000,
        tokenId: 100,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: MOCK_EVM_ADDRESS,
      })
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      });

    const promise = transferFromFunctionCall(args);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
    await expect(promise).rejects.toThrow('bob');
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallTransferFromInputSchema.parse({
        from: 'alice',
        to: 'bob',
        gas: 100000,
        tokenId: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when from is missing', () => {
    expect(() => {
      ContractErc721CallTransferFromInputSchema.parse({
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        tokenId: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when to is missing', () => {
    expect(() => {
      ContractErc721CallTransferFromInputSchema.parse({
        contract: 'my-contract',
        from: 'alice',
        gas: 100000,
        tokenId: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when value is negative', () => {
    expect(() => {
      ContractErc721CallTransferFromInputSchema.parse({
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        tokenId: -1,
      });
    }).toThrow(ZodError);
  });
});
