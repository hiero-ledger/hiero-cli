import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallSymbolOutput } from '@/plugins/contract-erc721/commands/symbol/output';

import { ZodError } from 'zod';

import { MOCK_CONTRACT_ID } from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { makeContractErc721CallCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { symbolFunctionCall } from '@/plugins/contract-erc721/commands/symbol/handler';
import { ContractErc721CallSymbolInputSchema } from '@/plugins/contract-erc721/commands/symbol/input';

const mockSymbol = 'MYNFT';

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

describe('contract-erc721 plugin - symbol command (unit)', () => {
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
          queryResult: [mockSymbol],
        }),
      },
    }).api;
  });

  test('calls ERC-721 symbol successfully and returns expected output', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
      },
    });

    const result = await symbolFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallSymbolOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.symbol).toBe(mockSymbol);
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
        functionName: 'symbol',
        args: [],
      }),
    );
  });

  test('calls ERC-721 symbol with contract as entity ID', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: MOCK_CONTRACT_ID,
      },
    });

    const result = await symbolFunctionCall(args);

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
        functionName: 'symbol',
        args: [],
      }),
    );
  });

  test('throws StateError when contractQuery returns empty queryResult', async () => {
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
      contractId: MOCK_CONTRACT_ID,
      queryResult: [],
    });

    await expect(symbolFunctionCall(args)).rejects.toThrow(StateError);
    await expect(symbolFunctionCall(args)).rejects.toThrow(
      `There was a problem with decoding contract ${MOCK_CONTRACT_ID} "symbol" function result`,
    );
  });

  test('propagates error when queryContractFunction throws', async () => {
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

    await expect(symbolFunctionCall(args)).rejects.toThrow(
      'contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallSymbolInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
