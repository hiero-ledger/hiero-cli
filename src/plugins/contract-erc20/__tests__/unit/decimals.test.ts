import type { CoreApi, Logger } from '@/core';
import type { ContractErc20CallDecimalsOutput } from '@/plugins/contract-erc20/commands/decimals/output';

import '@/core/utils/json-serialize';

import { ZodError } from 'zod';

import { Status } from '@/core/shared/constants';
import { makeContractErc20CallCommandArgs } from '@/plugins/contract-erc20/__tests__/unit/helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
} from '@/plugins/contract-erc20/__tests__/unit/helpers/mocks';
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
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks().api;
  });

  test('calls ERC-20 decimals successfully and returns expected output', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });

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
    const args = makeContractErc20CallCommandArgs({ api, logger });
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
    const args = makeContractErc20CallCommandArgs({ api, logger });
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
