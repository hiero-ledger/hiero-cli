import type { CommandHandlerArgs, CoreApi, Logger } from '@/core';
import type { ContractErc20CallApproveOutput } from '@/plugins/contract-erc20/commands/approve/output';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { approveFunctionCall as erc20ApproveHandler } from '@/plugins/contract-erc20/commands/approve/handler';
import { ContractErc20CallApproveInputSchema } from '@/plugins/contract-erc20/commands/approve/input';

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

describe('contract-erc20 plugin - approve command (unit)', () => {
  let api: CoreApi;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();

    api = {
      network: {
        getCurrentNetwork: jest.fn(() => 'testnet'),
      },
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
    } as unknown as CoreApi;
  });

  test('calls ERC-20 approve successfully and returns expected output', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'my-token',
        spender: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;

    const result = await erc20ApproveHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallApproveOutput;

    expect(parsed.contractId).toBe(CONTRACT_ID);
    expect(parsed.network).toBe('testnet');
    expect(parsed.transactionId).toBe(TX_ID);

    expect(args.api.identityResolution.resolveContract).toHaveBeenCalledWith({
      contractReference: 'my-token',
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
        functionName: 'approve',
      }),
    );
    expect(args.api.txExecution.signAndExecute).toHaveBeenCalledWith({});
  });

  test('uses entity ID when contract is entity ID (not alias)', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: '0.0.9999',
        spender: '0.0.8888',
        gas: 200000,
        value: 50,
      },
    } as unknown as CommandHandlerArgs;

    const result = await erc20ApproveHandler(args);

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

  test('uses EVM address directly when spender is EVM address', async () => {
    const evmSpender = '0x' + 'b'.repeat(40);
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: '0.0.1234',
        spender: evmSpender,
        gas: 100000,
        value: 1,
      },
    } as unknown as CommandHandlerArgs;

    const result = await erc20ApproveHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalled();
    expect(mockAddAddress).toHaveBeenCalledWith(evmSpender);
  });

  test('returns failure when signAndExecute returns success false', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'my-token',
        spender: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;
    (args.api.txExecution.signAndExecute as jest.Mock).mockResolvedValue({
      success: false,
      receipt: { status: { status: 'FAILURE' } },
    });

    const result = await erc20ApproveHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call approve function: FAILURE',
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
        spender: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;
    (args.api.txExecution.signAndExecute as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    const result = await erc20ApproveHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call approve function: network error',
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
        spender: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;

    (
      args.api.identityResolution.resolveContract as jest.Mock
    ).mockRejectedValue(
      new Error(
        'Alias "missing-contract" for contract on network "testnet" not found',
      ),
    );

    const result = await erc20ApproveHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to call approve function');
    expect(result.errorMessage).toContain('not found');
  });

  test('returns failure when mirror.getAccount has no evmAddress', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: '0.0.1234',
        spender: 'bob',
        gas: 100000,
        value: 100,
      },
    } as unknown as CommandHandlerArgs;

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: undefined,
      },
    );

    const result = await erc20ApproveHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallApproveInputSchema.parse({
        spender: 'bob',
        gas: 100000,
        value: 100,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when value is negative', () => {
    expect(() => {
      ContractErc20CallApproveInputSchema.parse({
        contract: 'my-token',
        spender: 'bob',
        gas: 100000,
        value: -1,
      });
    }).toThrow(ZodError);
  });
});
