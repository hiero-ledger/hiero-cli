import type { CoreApi } from '@/core';

import { ZodError } from 'zod';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { totalSupplyFunctionCall as erc20TotalSupplyHandler } from '@/plugins/contract-erc20/commands/total-supply/handler';
import { ContractErc20CallTotalSupplyInputSchema } from '@/plugins/contract-erc20/commands/total-supply/input';

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

describe('contract-erc20 plugin - totalSupply command (unit)', () => {
  let api: CoreApi;
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
          queryResult: [1000000000000000000n],
        }),
      },
    } as unknown as CoreApi;
  });

  test('calls ERC-20 totalSupply successfully and returns expected output', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20TotalSupplyHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    if (result.outputJson === undefined) {
      throw new Error('Expected outputJson to be defined');
    }
    const parsed = JSON.parse(result.outputJson);

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.totalSupply).toBe('1000000000000000000');
    expect(parsed.network).toBe('testnet');

    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'some-alias-or-id',
      'contract',
      'testnet',
    );
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractIdOrEvmAddress: '0.0.1234',
        functionName: 'totalSupply',
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

    const result = await erc20TotalSupplyHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "totalSupply" function result',
    );
  });

  test('returns failure when queryContractFunction throws', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc20TotalSupplyHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call totalSupply function: contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallTotalSupplyInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
