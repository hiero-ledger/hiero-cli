import type { CoreApi, Logger } from '@/core';
import type { ContractErc20CallTransferFromOutput } from '@/plugins/contract-erc20/commands/transfer-from';

import { ZodError } from 'zod';

import { NotFoundError, TransactionError } from '@/core/errors';
import { makeContractErc20ExecuteCommandArgs } from '@/plugins/contract-erc20/__tests__/unit/helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
} from '@/plugins/contract-erc20/__tests__/unit/helpers/mocks';
import { transferFromFunctionCall as erc20TransferFromHandler } from '@/plugins/contract-erc20/commands/transfer-from/handler';
import { ContractErc20CallTransferFromInputSchema } from '@/plugins/contract-erc20/commands/transfer-from/input';

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

const EVM_ADDRESS = '0x' + 'a'.repeat(40);
const CONTRACT_ID = '0.0.1234';
const ACCOUNT_ID = '0.0.5678';
const TX_ID = '0.0.1234@1234567890.123456789';

describe('contract-erc20 plugin - transferFrom command (unit)', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      identityResolution: {
        resolveContract: jest.fn().mockResolvedValue({
          contractId: CONTRACT_ID,
          evmAddress: EVM_ADDRESS,
        }),
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: ACCOUNT_ID,
          accountPublicKey: 'pub-key',
          evmAddress: EVM_ADDRESS,
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
          transactionId: TX_ID,
        }),
      },
    }).api;
  });

  test('calls ERC-20 transferFrom successfully and returns expected output', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });

    const result = await erc20TransferFromHandler(args);

    expect(result.result).toBeDefined();

    const parsed = result.result as ContractErc20CallTransferFromOutput;

    expect(parsed.contractId).toBe(CONTRACT_ID);
    expect(parsed.network).toBe('testnet');
    expect(parsed.transactionId).toBe(TX_ID);

    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: 'my-contract',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'alice',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'bob',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, EVM_ADDRESS);
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, EVM_ADDRESS);
    expect(mockAddUint256).toHaveBeenCalledWith(100);
    expect(args.api.contract.contractExecuteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: CONTRACT_ID,
        gas: 100000,
        functionName: 'transferFrom',
      }),
    );
    expect(args.api.txExecution.signAndExecute).toHaveBeenCalledWith({});
  });

  test('uses entity ID when contract, from and to are entity IDs', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.9999',
        from: '0.0.1111',
        to: '0.0.8888',
        gas: 200000,
        value: 50,
      },
    });

    const result = await erc20TransferFromHandler(args);

    expect(result.result).toBeDefined();

    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: '0.0.9999',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: '0.0.1111',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: '0.0.8888',
      type: expect.any(String),
      network: 'testnet',
    });
  });

  test('uses EVM address directly when from is EVM address', async () => {
    const fromEvm = '0x' + 'b'.repeat(40);
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        from: fromEvm,
        to: 'bob',
        gas: 100000,
        value: 1,
      },
    });

    const result = await erc20TransferFromHandler(args);

    expect(result.result).toBeDefined();

    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalledWith(
      expect.objectContaining({ accountReference: fromEvm }),
    );
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, fromEvm);
  });

  test('uses EVM address directly when to is EVM address', async () => {
    const toEvm = '0x' + 'c'.repeat(40);
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        from: 'alice',
        to: toEvm,
        gas: 100000,
        value: 1,
      },
    });

    const result = await erc20TransferFromHandler(args);

    expect(result.result).toBeDefined();

    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalledWith(
      expect.objectContaining({ accountReference: toEvm }),
    );
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, toEvm);
  });

  test('throws TransactionError when signAndExecute returns success false', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    await expect(erc20TransferFromHandler(args)).rejects.toThrow(
      TransactionError,
    );
    await expect(erc20TransferFromHandler(args)).rejects.toThrow('FAILURE');
  });

  test('throws when signAndExecute throws', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    await expect(erc20TransferFromHandler(args)).rejects.toThrow(
      'network error',
    );
  });

  test('throws when alias not found for contract', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'missing-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });

    (
      args.api.identityResolution.resolveContract as jest.Mock
    ).mockRejectedValue(
      new Error(
        'Alias "missing-contract" for contract on network "testnet" not found',
      ),
    );

    await expect(erc20TransferFromHandler(args)).rejects.toThrow(
      'Alias "missing-contract" for contract on network "testnet" not found',
    );
  });

  test('throws NotFoundError when resolveAccount for from has no evmAddress', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      })
      .mockResolvedValue({
        accountId: ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: EVM_ADDRESS,
      });

    const promise = erc20TransferFromHandler(args);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
    await expect(promise).rejects.toThrow('alice');
  });

  test('throws NotFoundError when resolveAccount for to has no evmAddress', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: EVM_ADDRESS,
      })
      .mockResolvedValue({
        accountId: ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      });

    const promise = erc20TransferFromHandler(args);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
    await expect(promise).rejects.toThrow('bob');
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallTransferFromInputSchema.parse({
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when from is missing', () => {
    expect(() => {
      ContractErc20CallTransferFromInputSchema.parse({
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        value: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when to is missing', () => {
    expect(() => {
      ContractErc20CallTransferFromInputSchema.parse({
        contract: 'my-contract',
        from: 'alice',
        gas: 100000,
        value: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when value is negative', () => {
    expect(() => {
      ContractErc20CallTransferFromInputSchema.parse({
        contract: 'my-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: -1,
      });
    }).toThrow(ZodError);
  });
});
