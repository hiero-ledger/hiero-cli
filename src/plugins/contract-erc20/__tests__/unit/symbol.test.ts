import type { CoreApi, Logger } from '@/core';
import type { ContractErc20CallSymbolOutput } from '@/plugins/contract-erc20/commands/symbol/output';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { makeContractErc20CallCommandArgs } from '@/plugins/contract-erc20/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc20/__tests__/unit/helpers/mocks';
import { symbolFunctionCall as erc20SymbolHandler } from '@/plugins/contract-erc20/commands/symbol/handler';
import { ContractErc20CallSymbolInputSchema } from '@/plugins/contract-erc20/commands/symbol/input';

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

describe('contract-erc20 plugin - symbol command (unit)', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: '0.0.1234',
          queryResult: ['HBAR'],
        }),
      },
    }).api;
  });

  test('calls ERC-20 symbol successfully and returns expected output', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });

    const result = await erc20SymbolHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallSymbolOutput;

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.contractSymbol).toBe('HBAR');
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
        functionName: 'symbol',
      }),
    );
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    const result = await erc20SymbolHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "symbol" function result',
    );
  });

  test('returns failure when queryContractFunction throws', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc20SymbolHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call symbol function: contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallSymbolInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
