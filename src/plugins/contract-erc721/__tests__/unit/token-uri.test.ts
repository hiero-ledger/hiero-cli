import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallTokenUriOutput } from '@/plugins/contract-erc721/commands/token-uri/output';

import { ZodError } from 'zod';

import { MOCK_CONTRACT_ID } from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { makeContractErc721CallCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { tokenUriFunctionCall } from '@/plugins/contract-erc721/commands/token-uri/handler';
import { ContractErc721CallTokenUriInputSchema } from '@/plugins/contract-erc721/commands/token-uri/input';

const mockTokenUri = 'https://example.com/metadata/1';

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

describe('contract-erc721 plugin - tokenURI command (unit)', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      identityResolution: {
        resolveReferenceToEntityOrEvmAddress: jest
          .fn()
          .mockReturnValue({ entityIdOrEvmAddress: MOCK_CONTRACT_ID }),
        resolveAccount: jest.fn(),
        resolveContract: jest.fn(),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: MOCK_CONTRACT_ID,
          queryResult: [mockTokenUri],
        }),
      },
    }).api;
  });

  test('calls ERC-721 tokenURI successfully and returns expected output', async () => {
    const tokenId = 42;
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        tokenId,
      },
    });

    const result = await tokenUriFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallTokenUriOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.tokenId).toBe(tokenId);
    expect(output.tokenURI).toBe(mockTokenUri);
    expect(output.network).toBe(SupportedNetwork.TESTNET);

    expect(
      args.api.identityResolution.resolveReferenceToEntityOrEvmAddress,
    ).toHaveBeenCalledWith({
      entityReference: 'some-alias-or-id',
      referenceType: expect.any(String),
      network: SupportedNetwork.TESTNET,
      aliasType: expect.any(String),
    });
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractIdOrEvmAddress: MOCK_CONTRACT_ID,
        functionName: 'tokenURI',
        args: [tokenId],
      }),
    );
  });

  test('calls ERC-721 tokenURI with contract as entity ID', async () => {
    const tokenId = 42;
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
        tokenId,
      },
    });

    const result = await tokenUriFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(
      args.api.identityResolution.resolveReferenceToEntityOrEvmAddress,
    ).toHaveBeenCalledWith({
      entityReference: MOCK_CONTRACT_ID,
      referenceType: expect.any(String),
      network: SupportedNetwork.TESTNET,
      aliasType: expect.any(String),
    });
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractIdOrEvmAddress: MOCK_CONTRACT_ID,
        functionName: 'tokenURI',
        args: [tokenId],
      }),
    );
  });

  test('throws StateError when contractQuery returns empty queryResult', async () => {
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
      contractId: MOCK_CONTRACT_ID,
      queryResult: [],
    });

    await expect(tokenUriFunctionCall(args)).rejects.toThrow(StateError);
    await expect(tokenUriFunctionCall(args)).rejects.toThrow(
      `There was a problem with decoding contract ${MOCK_CONTRACT_ID} "tokenURI" function result`,
    );
  });

  test('propagates error when queryContractFunction throws', async () => {
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

    await expect(tokenUriFunctionCall(args)).rejects.toThrow(
      'contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallTokenUriInputSchema.parse({ tokenId: 1 });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is missing', () => {
    expect(() => {
      ContractErc721CallTokenUriInputSchema.parse({
        contract: 'some-alias-or-id',
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is negative', () => {
    expect(() => {
      ContractErc721CallTokenUriInputSchema.parse({
        contract: 'some-alias-or-id',
        tokenId: -1,
      });
    }).toThrow(ZodError);
  });
});
