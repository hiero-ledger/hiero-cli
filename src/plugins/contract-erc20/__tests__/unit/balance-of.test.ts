import type { CommandHandlerArgs, CoreApi } from '@/core';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { balanceOfFunctionCall as erc20BalanceOfHandler } from '@/plugins/contract-erc20/commands/balance-of/handler';
import { ContractErc20CallBalanceOfInputSchema } from '@/plugins/contract-erc20/commands/balance-of/input';

const mockSolidityAddress = '1234567890123456789012345678901234567890';

jest.mock('@hashgraph/sdk', () => ({
  ContractId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    })),
  },
  AccountId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => mockSolidityAddress),
    })),
  },
  TokenType: {
    NonFungibleUnique: 'NonFungibleUnique',
    FungibleCommon: 'FungibleCommon',
  },
}));

describe('contract-erc20 plugin - balanceOf command (unit)', () => {
  let api: CoreApi;
  let logger: ReturnType<typeof makeLogger>;

  const accountAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();

    logger = makeLogger();

    api = {
      network: {
        getCurrentNetwork: jest.fn(() => 'testnet'),
      },
      identityResolution: {
        resolveReferenceToEntityOrEvmAddress: jest
          .fn()
          .mockReturnValue({ entityIdOrEvmAddress: '0.0.1234' }),
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: '0.0.5678',
          accountPublicKey: 'pub-key',
          evmAddress: accountAddress,
        }),
        resolveContract: jest.fn(),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: '0.0.1234',
          queryResult: [5000000000000000000n],
        }),
      },
    } as unknown as CoreApi;
  });

  test('calls ERC-20 balanceOf successfully and returns expected output', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'some-alias-or-id',
        account: accountAddress,
      },
    } as unknown as CommandHandlerArgs;

    const result = await erc20BalanceOfHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    if (result.outputJson === undefined) {
      throw new Error('Expected outputJson to be defined');
    }
    const parsed = JSON.parse(result.outputJson);

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.account).toBe(accountAddress);
    expect(parsed.balance).toBe('5000000000000000000');
    expect(parsed.network).toBe('testnet');

    expect(
      args.api.identityResolution.resolveReferenceToEntityOrEvmAddress,
    ).toHaveBeenCalledWith({
      entityReference: 'some-alias-or-id',
      referenceType: expect.any(String),
      network: 'testnet',
      aliasType: expect.any(String),
    });
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractIdOrEvmAddress: '0.0.1234',
        functionName: 'balanceOf',
        args: [accountAddress],
      }),
    );
  });

  test('calls ERC-20 balanceOf with account as entity ID and resolves to EVM address', async () => {
    const accountId = '0.0.5678';
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'some-alias-or-id',
        account: accountId,
      },
    } as unknown as CommandHandlerArgs;

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId,
        accountPublicKey: 'pub-key',
        evmAddress: `0x${mockSolidityAddress}`,
      },
    );

    const result = await erc20BalanceOfHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    if (result.outputJson === undefined) {
      throw new Error('Expected outputJson to be defined');
    }
    const parsed = JSON.parse(result.outputJson);

    expect(parsed.account).toBe(`0x${mockSolidityAddress}`);
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [`0x${mockSolidityAddress}`],
      }),
    );
  });

  test('calls ERC-20 balanceOf with account as alias and resolves to EVM address', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'some-alias-or-id',
        account: 'my-account-alias',
      },
    } as unknown as CommandHandlerArgs;

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: '0.0.9999',
        accountPublicKey: 'pub-key-alias',
        evmAddress: `0x${mockSolidityAddress}`,
      },
    );

    const result = await erc20BalanceOfHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'my-account-alias',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [`0x${mockSolidityAddress}`],
      }),
    );
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'some-alias-or-id',
        account: accountAddress,
      },
    } as unknown as CommandHandlerArgs;
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    const result = await erc20BalanceOfHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "balanceOf" function result',
    );
  });

  test('returns failure when queryContractFunction throws', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'some-alias-or-id',
        account: accountAddress,
      },
    } as unknown as CommandHandlerArgs;
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc20BalanceOfHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call balanceOf function: contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallBalanceOfInputSchema.parse({ account: accountAddress });
    }).toThrow(ZodError);
  });

  test('schema validation fails when account is missing', () => {
    expect(() => {
      ContractErc20CallBalanceOfInputSchema.parse({
        contract: 'some-alias-or-id',
      });
    }).toThrow(ZodError);
  });
});
