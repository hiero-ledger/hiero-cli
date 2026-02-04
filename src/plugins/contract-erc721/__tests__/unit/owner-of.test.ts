import type { CoreApi, Logger } from '@/core';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { makeContractErc721CallCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { ownerOfFunctionCall as erc721OwnerOfHandler } from '@/plugins/contract-erc721/commands/owner-of/handler';
import { ContractErc721CallOwnerOfInputSchema } from '@/plugins/contract-erc721/commands/owner-of/input';

const mockOwnerAddress = '0x1234567890123456789012345678901234567890';

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

describe('contract-erc721 plugin - ownerOf command (unit)', () => {
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
          queryResult: [mockOwnerAddress],
        }),
      },
    }).api;
  });

  test('calls ERC-721 ownerOf successfully and returns expected output', async () => {
    const tokenId = 42;
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        tokenId,
      },
    });

    const result = await erc721OwnerOfHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    if (result.outputJson === undefined) {
      throw new Error('Expected outputJson to be defined');
    }
    const parsed = JSON.parse(result.outputJson);

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.owner).toBe(mockOwnerAddress);
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
        functionName: 'ownerOf',
        args: [tokenId],
      }),
    );
  });

  test('calls ERC-721 ownerOf with contract as entity ID', async () => {
    const tokenId = 1;
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        tokenId,
      },
    });

    const result = await erc721OwnerOfHandler(args);

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
        functionName: 'ownerOf',
        args: [tokenId],
      }),
    );
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        tokenId: 10,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    const result = await erc721OwnerOfHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "ownerOf" function result',
    );
  });

  test('returns failure when queryContractFunction throws', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        tokenId: 10,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc721OwnerOfHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call ownerOf function: contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallOwnerOfInputSchema.parse({ tokenId: 1 });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is missing', () => {
    expect(() => {
      ContractErc721CallOwnerOfInputSchema.parse({
        contract: 'some-alias-or-id',
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is negative', () => {
    expect(() => {
      ContractErc721CallOwnerOfInputSchema.parse({
        contract: 'some-alias-or-id',
        tokenId: -1,
      });
    }).toThrow(ZodError);
  });
});
