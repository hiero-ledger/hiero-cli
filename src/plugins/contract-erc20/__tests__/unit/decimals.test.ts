import type { CommandHandlerArgs, CoreApi } from '@/core';
import type { ContractErc20CallDecimalsOutput } from '@/plugins/contract-erc20/commands/decimals/output';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { decimalsFunctionCall as erc20DecimalsHandler } from '@/plugins/contract-erc20/commands/decimals/handler';
import { ContractErc20CallDecimalsInputSchema } from '@/plugins/contract-erc20/commands/decimals/input';

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

describe('contract-erc20 plugin - decimals command (unit)', () => {
  let api: CommandHandlerArgs['api'];
  let logger: ReturnType<typeof makeLogger>;

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
        resolveAccount: jest.fn(),
        resolveContract: jest.fn(),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: '0.0.1234',
          queryResult: [18],
        }),
      },
    } as unknown as CoreApi;
  });

  test('calls ERC-20 decimals successfully and returns expected output', async () => {
    const args = {
      api,
      logger,
      state: {} as unknown,
      config: {} as unknown,
      args: {
        contract: 'some-alias-or-id',
      },
    } as unknown as CommandHandlerArgs;

    const result = await erc20DecimalsHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallDecimalsOutput;

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.decimals).toBe(18);
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
        functionName: 'decimals',
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
      },
    } as unknown as CommandHandlerArgs;
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    const result = await erc20DecimalsHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "decimals" function result',
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
      },
    } as unknown as CommandHandlerArgs;
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc20DecimalsHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call decimals function: contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallDecimalsInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
