import type { CoreApi, Logger } from '@/core';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { makeContractErc721CallCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { nameFunctionCall as erc721NameHandler } from '@/plugins/contract-erc721/commands/name/handler';
import { ContractErc721CallNameInputSchema } from '@/plugins/contract-erc721/commands/name/input';

const mockName = 'My-NFT-Collection';

jest.mock('@hashgraph/sdk', () => ({
  ContractId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    })),
  },
  AccountId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => '1234567890123456789012345678901234567890'),
    })),
  },
  TokenType: {
    NonFungibleUnique: 'NonFungibleUnique',
    FungibleCommon: 'FungibleCommon',
  },
}));

describe('contract-erc721 plugin - name command (unit)', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
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
          queryResult: [mockName],
        }),
      },
    }).api;
  });

  test('calls ERC-721 name successfully and returns expected output', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
      },
    });

    const result = await erc721NameHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    if (result.outputJson === undefined) {
      throw new Error('Expected outputJson to be defined');
    }
    const parsed = JSON.parse(result.outputJson);

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.contractName).toBe(mockName);
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
        functionName: 'name',
        args: [],
      }),
    );
  });

  test('calls ERC-721 name with contract as entity ID', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
      },
    });

    const result = await erc721NameHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(
      args.api.identityResolution.resolveReferenceToEntityOrEvmAddress,
    ).toHaveBeenCalledWith({
      entityReference: '0.0.1234',
      referenceType: expect.any(String),
      network: 'testnet',
      aliasType: expect.any(String),
    });
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractIdOrEvmAddress: '0.0.1234',
        functionName: 'name',
        args: [],
      }),
    );
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    const result = await erc721NameHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "name" function result',
    );
  });

  test('returns failure when queryContractFunction throws', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc721NameHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call name function: contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallNameInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
