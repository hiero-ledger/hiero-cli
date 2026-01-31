import type { CommandHandlerArgs, CoreApi } from '@/core';
import type { ContractErc20CallNameOutput } from '@/plugins/contract-erc20/commands/name/output';

import { ZodError } from 'zod';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { nameFunctionCall as erc20NameHandler } from '@/plugins/contract-erc20/commands/name/handler';
import { ContractErc20CallNameInputSchema } from '@/plugins/contract-erc20/commands/name/input';

jest.mock('@hashgraph/sdk', () => ({
  ContractId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    })),
  },
  TokenType: {
    NonFungibleUnique: 'NonFungibleUnique',
    FungibleCommon: 'FungibleCommon',
  },
}));

describe('contract-erc20 plugin - name command (unit)', () => {
  let api: CommandHandlerArgs['api'];
  let logger: ReturnType<typeof makeLogger>;

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
          queryResult: ['MyToken'],
        }),
      },
    } as unknown as CoreApi;
  });

  test('calls ERC-20 name successfully and returns expected output', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20NameHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallNameOutput;

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.contractName).toBe('MyToken');
    expect(parsed.network).toBe('testnet');

    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'some-alias-or-id',
      'contract',
      'testnet',
    );
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractIdOrEvmAddress: '0.0.1234',
        functionName: 'name',
      }),
    );
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    const result = await erc20NameHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "name" function result',
    );
  });

  test('returns failure when queryContractFunction throws', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc20NameHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call name function: contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallNameInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
