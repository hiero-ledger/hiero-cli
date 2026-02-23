import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallSafeTransferFromOutput } from '@/plugins/contract-erc721/commands/safe-transfer-from/output';

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
  MOCK_CONTRACT_ID_ALT,
} from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { safeTransferFromFunctionCall } from '@/plugins/contract-erc721/commands/safe-transfer-from/handler';
import { ContractErc721CallSafeTransferFromInputSchema } from '@/plugins/contract-erc721/commands/safe-transfer-from/input';

const mockAddAddress = jest.fn().mockReturnThis();
const mockAddUint256 = jest.fn().mockReturnThis();
const mockAddBytes = jest.fn().mockReturnThis();

jest.mock('@hashgraph/sdk', () => ({
  ContractFunctionParameters: jest.fn(() => ({
    addAddress: mockAddAddress,
    addUint256: mockAddUint256,
    addBytes: mockAddBytes,
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

describe('contract-erc721 plugin - safeTransferFrom command (unit)', () => {
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

  test('calls ERC-721 safeTransferFrom successfully and returns expected output', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        from: 'alice',
        to: 'bob',
        tokenId: 42,
        gas: 100000,
      },
    });

    const result = await safeTransferFromFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallSafeTransferFromOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.transactionId).toBe(MOCK_TX_ID);

    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: 'some-contract',
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledTimes(2);
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, MOCK_EVM_ADDRESS);
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, MOCK_EVM_ADDRESS);
    expect(mockAddUint256).toHaveBeenCalledWith(42);
    expect(mockAddBytes).not.toHaveBeenCalled();
    expect(args.api.contract.contractExecuteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        gas: 100000,
        functionName: 'safeTransferFrom',
      }),
    );
    expect(args.api.txExecution.signAndExecute).toHaveBeenCalledWith({});
  });

  test('calls safeTransferFrom with optional data (4-arg overload)', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID_ALT,
        from: 'alice',
        to: 'bob',
        tokenId: 1,
        gas: 200000,
        data: '0xdead',
      },
    });

    const result = await safeTransferFromFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(mockAddBytes).toHaveBeenCalledWith(expect.any(Buffer));
    const bufferArg = mockAddBytes.mock.calls[0][0];
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(bufferArg.equals(Buffer.from('dead', 'hex'))).toBe(true);
  });

  test('uses EVM addresses directly when from/to are EVM addresses', async () => {
    const fromEvm = MOCK_EVM_ADDRESS;
    const toEvm = MOCK_EVM_ADDRESS_ALT;
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        from: fromEvm,
        to: toEvm,
        tokenId: 5,
        gas: 100000,
      },
    });

    const result = await safeTransferFromFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalled();
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, fromEvm);
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, toEvm);
    expect(mockAddUint256).toHaveBeenCalledWith(5);
  });

  test('throws TransactionError when signAndExecute returns success false', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        tokenId: 1,
        gas: 100000,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    await expect(safeTransferFromFunctionCall(args)).rejects.toThrow(
      TransactionError,
    );
    await expect(safeTransferFromFunctionCall(args)).rejects.toThrow(
      'Failed to call safeTransferFrom function: FAILURE',
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
        tokenId: 1,
        gas: 100000,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    await expect(safeTransferFromFunctionCall(args)).rejects.toThrow(
      'network error',
    );
  });

  test('propagates error when contract not found', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'missing-contract',
        from: 'alice',
        to: 'bob',
        tokenId: 1,
        gas: 100000,
      },
    });

    (
      args.api.identityResolution.resolveContract as jest.Mock
    ).mockRejectedValue(
      new Error(
        `Alias "missing-contract" for contract on network "${SupportedNetwork.TESTNET}" not found`,
      ),
    );

    await expect(safeTransferFromFunctionCall(args)).rejects.toThrow(
      'not found',
    );
  });

  test('throws NotFoundError when from has no evmAddress', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        from: 'alice',
        to: 'bob',
        tokenId: 1,
        gas: 100000,
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

    const promise = safeTransferFromFunctionCall(args);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('throws NotFoundError when to has no evmAddress', async () => {
    const args = makeContractErc721ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        from: 'alice',
        to: 'bob',
        tokenId: 1,
        gas: 100000,
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

    const promise = safeTransferFromFunctionCall(args);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallSafeTransferFromInputSchema.parse({
        from: 'alice',
        to: 'bob',
        tokenId: 1,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when from is missing', () => {
    expect(() => {
      ContractErc721CallSafeTransferFromInputSchema.parse({
        contract: 'my-contract',
        to: 'bob',
        tokenId: 1,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when to is missing', () => {
    expect(() => {
      ContractErc721CallSafeTransferFromInputSchema.parse({
        contract: 'my-contract',
        from: 'alice',
        tokenId: 1,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is missing', () => {
    expect(() => {
      ContractErc721CallSafeTransferFromInputSchema.parse({
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when data is invalid hex string', () => {
    expect(() => {
      ContractErc721CallSafeTransferFromInputSchema.parse({
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        tokenId: 1,
        data: '0xzzzz',
      });
    }).toThrow(ZodError);
  });
});
