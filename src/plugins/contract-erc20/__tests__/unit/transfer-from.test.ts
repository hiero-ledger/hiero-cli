import type { CommandHandlerArgs, CoreApi, Logger } from '@/core';
import type { ContractErc20CallTransferFromOutput } from '@/plugins/contract-erc20/commands/transfer-from/output';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
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

const EVM_FROM = '0x' + 'b'.repeat(40);
const EVM_TO = '0x' + 'c'.repeat(40);
const CONTRACT_ID = '0.0.1234';
const ACCOUNT_FROM_ID = '0.0.5678';
const ACCOUNT_TO_ID = '0.0.9012';
const TX_ID = '0.0.1234@1234567890.123456789';

describe('contract-erc20 plugin - transfer-from command (unit)', () => {
  let api: CoreApi;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();

    api = {
      network: {
        getCurrentNetwork: jest.fn(() => 'testnet'),
      },
      alias: {
        resolveOrThrow: jest.fn().mockImplementation((alias, type) => {
          if (type === 'contract') {
            return {
              entityId: CONTRACT_ID,
              alias,
              type: 'contract',
              network: 'testnet',
              createdAt: '2024-01-01T00:00:00.000Z',
            };
          }
          if (alias === 'alice') {
            return {
              entityId: ACCOUNT_FROM_ID,
              alias,
              type: 'account',
              network: 'testnet',
              createdAt: '2024-01-01T00:00:00.000Z',
            };
          }
          return {
            entityId: ACCOUNT_TO_ID,
            alias,
            type: 'account',
            network: 'testnet',
            createdAt: '2024-01-01T00:00:00.000Z',
          };
        }),
      },
      mirror: {
        getContractInfo: jest.fn().mockResolvedValue({
          contract_id: CONTRACT_ID,
        }),
        getAccount: jest.fn().mockImplementation((accountId: string) => {
          if (accountId === ACCOUNT_FROM_ID) {
            return Promise.resolve({ evmAddress: EVM_FROM });
          }
          return Promise.resolve({ evmAddress: EVM_TO });
        }),
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
    } as unknown as CoreApi;
  });

  test('calls ERC-20 transferFrom successfully and returns expected output', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'my-token',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallTransferFromOutput;

    expect(parsed.contractId).toBe(CONTRACT_ID);
    expect(parsed.network).toBe('testnet');
    expect(parsed.transactionId).toBe(TX_ID);

    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'my-token',
      'contract',
      'testnet',
    );
    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'alice',
      'account',
      'testnet',
    );
    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'bob',
      'account',
      'testnet',
    );
    expect(args.api.mirror.getContractInfo).toHaveBeenCalledWith(CONTRACT_ID);
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(ACCOUNT_FROM_ID);
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(ACCOUNT_TO_ID);
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, EVM_FROM);
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, EVM_TO);
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

  test('uses entity ID when contract, from and to are entity IDs (not alias)', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: '0.0.9999',
        from: '0.0.1111',
        to: '0.0.2222',
        gas: 200000,
        value: 50,
      },
    } as unknown as CommandHandlerArgs;

    (args.api.mirror.getContractInfo as jest.Mock).mockResolvedValue({
      contract_id: '0.0.9999',
    });
    (args.api.mirror.getAccount as jest.Mock)
      .mockResolvedValueOnce({ evmAddress: EVM_FROM })
      .mockResolvedValueOnce({ evmAddress: EVM_TO });

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.alias.resolveOrThrow).not.toHaveBeenCalled();
    expect(args.api.mirror.getContractInfo).toHaveBeenCalledWith('0.0.9999');
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith('0.0.1111');
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith('0.0.2222');
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, EVM_FROM);
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, EVM_TO);
  });

  test('uses EVM address directly when from is EVM address', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: '0.0.1234',
        from: EVM_FROM,
        to: 'bob',
        gas: 100000,
        value: 1,
      },
    } as unknown as CommandHandlerArgs;

    (args.api.mirror.getContractInfo as jest.Mock).mockResolvedValue({
      contract_id: CONTRACT_ID,
    });
    (args.api.mirror.getAccount as jest.Mock).mockResolvedValue({
      evmAddress: EVM_TO,
    });

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.mirror.getAccount).toHaveBeenCalledTimes(1);
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(ACCOUNT_TO_ID);
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, EVM_FROM);
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, EVM_TO);
  });

  test('uses EVM address directly when to is EVM address', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: '0.0.1234',
        from: 'alice',
        to: EVM_TO,
        gas: 100000,
        value: 1,
      },
    } as unknown as CommandHandlerArgs;

    (args.api.mirror.getContractInfo as jest.Mock).mockResolvedValue({
      contract_id: CONTRACT_ID,
    });
    (args.api.mirror.getAccount as jest.Mock).mockResolvedValue({
      evmAddress: EVM_FROM,
    });

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.mirror.getAccount).toHaveBeenCalledTimes(1);
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(ACCOUNT_FROM_ID);
    expect(mockAddAddress).toHaveBeenNthCalledWith(1, EVM_FROM);
    expect(mockAddAddress).toHaveBeenNthCalledWith(2, EVM_TO);
  });

  test('returns failure when signAndExecute returns success false', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'my-token',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call transferFrom function: FAILURE',
    );
  });

  test('returns failure when signAndExecute throws', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'my-token',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call transferFrom function: network error',
    );
  });

  test('returns failure when alias not found for contract', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'missing-contract',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;
    (args.api.alias.resolveOrThrow as jest.Mock).mockImplementation(
      (alias: string, type: string) => {
        if (type === 'contract' && alias === 'missing-contract') {
          throw new Error(
            'Alias "missing-contract" for contract on network "testnet" not found',
          );
        }
        if (alias === 'alice') {
          return {
            entityId: ACCOUNT_FROM_ID,
            alias,
            type: 'account',
            network: 'testnet',
            createdAt: '2024-01-01T00:00:00.000Z',
          };
        }
        return {
          entityId: ACCOUNT_TO_ID,
          alias,
          type: 'account',
          network: 'testnet',
          createdAt: '2024-01-01T00:00:00.000Z',
        };
      },
    );

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call transferFrom function',
    );
    expect(result.errorMessage).toContain('not found');
  });

  test('returns failure when mirror.getAccount has no evmAddress for from', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: '0.0.1234',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;
    (args.api.mirror.getContractInfo as jest.Mock).mockResolvedValue({
      contract_id: CONTRACT_ID,
    });
    (args.api.mirror.getAccount as jest.Mock)
      .mockResolvedValueOnce({ evmAddress: undefined })
      .mockResolvedValueOnce({ evmAddress: EVM_TO });

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      "Couldn't resolve EVM address for an account",
    );
    expect(result.errorMessage).toContain(ACCOUNT_FROM_ID);
  });

  test('returns failure when mirror.getAccount has no evmAddress for to', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: '0.0.1234',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;
    (args.api.mirror.getContractInfo as jest.Mock).mockResolvedValue({
      contract_id: CONTRACT_ID,
    });
    (args.api.mirror.getAccount as jest.Mock)
      .mockResolvedValueOnce({ evmAddress: EVM_FROM })
      .mockResolvedValueOnce({ evmAddress: undefined });

    const result = await erc20TransferFromHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      "Couldn't resolve EVM address for an account",
    );
    expect(result.errorMessage).toContain(ACCOUNT_TO_ID);
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
        contract: 'my-token',
        to: 'bob',
        gas: 100000,
        value: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when to is missing', () => {
    expect(() => {
      ContractErc20CallTransferFromInputSchema.parse({
        contract: 'my-token',
        from: 'alice',
        gas: 100000,
        value: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when value is negative', () => {
    expect(() => {
      ContractErc20CallTransferFromInputSchema.parse({
        contract: 'my-token',
        from: 'alice',
        to: 'bob',
        gas: 100000,
        value: -1,
      });
    }).toThrow(ZodError);
  });
});
