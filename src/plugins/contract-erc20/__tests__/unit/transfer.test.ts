import type { CoreApi, Logger } from '@/core';
import type { ContractErc20CallTransferOutput } from '@/plugins/contract-erc20/commands/transfer';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError, TransactionError } from '@/core/errors';
import { makeContractErc20ExecuteCommandArgs } from '@/plugins/contract-erc20/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc20/__tests__/unit/helpers/mocks';
import { transferFunctionCall as erc20TransferHandler } from '@/plugins/contract-erc20/commands/transfer/handler';
import { ContractErc20CallTransferInputSchema } from '@/plugins/contract-erc20/commands/transfer/input';

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

describe('contract-erc20 plugin - transfer command (unit)', () => {
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

  test('calls ERC-20 transfer successfully and returns expected output', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });

    const result = await erc20TransferHandler(args);

    expect(result.result).toBeDefined();

    const parsed = result.result as ContractErc20CallTransferOutput;

    expect(parsed.contractId).toBe(CONTRACT_ID);
    expect(parsed.network).toBe('testnet');
    expect(parsed.transactionId).toBe(TX_ID);

    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: 'my-contract',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'bob',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(mockAddAddress).toHaveBeenCalledWith(EVM_ADDRESS);
    expect(mockAddUint256).toHaveBeenCalledWith(100);
    expect(args.api.contract.contractExecuteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: CONTRACT_ID,
        gas: 100000,
        functionName: 'transfer',
      }),
    );
    expect(args.api.txExecution.signAndExecute).toHaveBeenCalledWith({});
  });

  test('uses entity ID when contract is entity ID (not alias)', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.9999',
        to: '0.0.8888',
        gas: 200000,
        value: 50,
      },
    });

    const result = await erc20TransferHandler(args);

    expect(result.result).toBeDefined();
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
    const evmTo = '0x' + 'b'.repeat(40);
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        to: evmTo,
        gas: 100000,
        value: 1,
      },
    });

    const result = await erc20TransferHandler(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalled();
    expect(mockAddAddress).toHaveBeenCalledWith(evmTo);
  });

  test('throws TransactionError when signAndExecute returns success false', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    await expect(erc20TransferHandler(args)).rejects.toThrow(TransactionError);
    await expect(erc20TransferHandler(args)).rejects.toThrow('FAILURE');
  });

  test('throws when signAndExecute throws', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    await expect(erc20TransferHandler(args)).rejects.toThrow('network error');
  });

  test('throws when alias not found for contract', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: 'missing-contract',
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

    await expect(erc20TransferHandler(args)).rejects.toThrow(
      'Alias "missing-contract" for contract on network "testnet" not found',
    );
  });

  test('throws NotFoundError when mirror.getAccount has no evmAddress', async () => {
    const args = makeContractErc20ExecuteCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      },
    );

    await expect(erc20TransferHandler(args)).rejects.toThrow(NotFoundError);
    await expect(erc20TransferHandler(args)).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallTransferInputSchema.parse({
        to: 'bob',
        gas: 100000,
        value: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when value is negative', () => {
    expect(() => {
      ContractErc20CallTransferInputSchema.parse({
        contract: 'my-contract',
        to: 'bob',
        gas: 100000,
        value: -1,
      });
    }).toThrow(ZodError);
  });
});
