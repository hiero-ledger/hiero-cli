import type { CoreApi, Logger } from '@/core';

import { ZodError } from 'zod';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
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
          return {
            entityId: ACCOUNT_ID,
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
        getAccount: jest.fn().mockResolvedValue({
          evmAddress: EVM_ADDRESS,
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

  test('calls ERC-20 transfer successfully and returns expected output', async () => {
    const args = makeArgs(api, logger, {
      contract: 'my-token',
      to: 'bob',
      gas: 100000,
      value: 100,
    });

    const result = await erc20TransferHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(result.outputJson as string);

    expect(parsed.contractIdOrEvm).toBe(CONTRACT_ID);
    expect(parsed.network).toBe('testnet');
    expect(parsed.transactionId).toBe(TX_ID);

    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'my-token',
      'contract',
      'testnet',
    );
    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'bob',
      'account',
      'testnet',
    );
    expect(args.api.mirror.getContractInfo).toHaveBeenCalledWith(CONTRACT_ID);
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(ACCOUNT_ID);
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
    const args = makeArgs(api, logger, {
      contract: '0.0.9999',
      to: '0.0.8888',
      gas: 200000,
      value: 50,
    });

    (args.api.mirror.getContractInfo as jest.Mock).mockResolvedValue({
      contract_id: '0.0.9999',
    });
    (args.api.mirror.getAccount as jest.Mock).mockResolvedValue({
      evmAddress: EVM_ADDRESS,
    });

    const result = await erc20TransferHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.alias.resolveOrThrow).not.toHaveBeenCalled();
    expect(args.api.mirror.getContractInfo).toHaveBeenCalledWith('0.0.9999');
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith('0.0.8888');
  });

  test('uses EVM address directly when to is EVM address', async () => {
    const evmTo = '0x' + 'b'.repeat(40);
    const args = makeArgs(api, logger, {
      contract: '0.0.1234',
      to: evmTo,
      gas: 100000,
      value: 1,
    });

    (args.api.mirror.getContractInfo as jest.Mock).mockResolvedValue({
      contract_id: CONTRACT_ID,
    });

    const result = await erc20TransferHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.mirror.getAccount).not.toHaveBeenCalled();
    expect(mockAddAddress).toHaveBeenCalledWith(evmTo);
  });

  test('returns failure when signAndExecute returns success false', async () => {
    const args = makeArgs(api, logger, {
      contract: 'my-token',
      to: 'bob',
      gas: 100000,
      value: 100,
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    const result = await erc20TransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call transfer function: FAILURE',
    );
  });

  test('returns failure when signAndExecute throws', async () => {
    const args = makeArgs(api, logger, {
      contract: 'my-token',
      to: 'bob',
      gas: 100000,
      value: 100,
    });
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    const result = await erc20TransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call transfer function: network error',
    );
  });

  test('returns failure when alias not found for contract', async () => {
    const args = makeArgs(api, logger, {
      contract: 'missing-contract',
      to: 'bob',
      gas: 100000,
      value: 100,
    });
    (args.api.alias.resolveOrThrow as jest.Mock).mockImplementation(
      (alias: string, type: string) => {
        if (type === 'contract' && alias === 'missing-contract') {
          throw new Error(
            'Alias "missing-contract" for contract on network "testnet" not found',
          );
        }
        return {
          entityId: ACCOUNT_ID,
          alias,
          type: 'account',
          network: 'testnet',
          createdAt: '2024-01-01T00:00:00.000Z',
        };
      },
    );

    const result = await erc20TransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to call transfer function');
    expect(result.errorMessage).toContain('not found');
  });

  test('returns failure when mirror.getAccount has no evmAddress', async () => {
    const args = makeArgs(api, logger, {
      contract: '0.0.1234',
      to: 'bob',
      gas: 100000,
      value: 100,
    });
    (args.api.mirror.getContractInfo as jest.Mock).mockResolvedValue({
      contract_id: CONTRACT_ID,
    });
    (args.api.mirror.getAccount as jest.Mock).mockResolvedValue({
      evmAddress: undefined,
    });

    const result = await erc20TransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
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
        contract: 'my-token',
        to: 'bob',
        gas: 100000,
        value: -1,
      });
    }).toThrow(ZodError);
  });
});
