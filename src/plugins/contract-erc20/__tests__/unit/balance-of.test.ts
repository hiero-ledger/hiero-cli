import type { CoreApi } from '@/core';

import { ZodError } from 'zod';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
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
      alias: {
        resolveOrThrow: jest.fn().mockReturnValue({
          entityId: '0.0.1234',
          alias: 'some-alias-or-id',
          type: 'contract',
          network: 'testnet',
          createdAt: '2024-01-01T00:00:00.000Z',
        }),
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
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
      account: accountAddress,
    });

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

    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'some-alias-or-id',
      'contract',
      'testnet',
    );
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
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
      account: accountId,
    });

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
    (api.alias.resolveOrThrow as jest.Mock).mockImplementation(
      (alias: string, type: string) => {
        if (type === 'account') {
          return {
            entityId: '0.0.9999',
            alias,
            type: 'account',
            network: 'testnet',
            createdAt: '2024-01-01T00:00:00.000Z',
          };
        }
        return {
          entityId: '0.0.1234',
          alias: 'some-alias-or-id',
          type: 'contract',
          network: 'testnet',
          createdAt: '2024-01-01T00:00:00.000Z',
        };
      },
    );

    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
      account: 'my-account-alias',
    });

    const result = await erc20BalanceOfHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'my-account-alias',
      'account',
      'testnet',
    );
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [`0x${mockSolidityAddress}`],
      }),
    );
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
      account: accountAddress,
    });
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
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
      account: accountAddress,
    });
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
