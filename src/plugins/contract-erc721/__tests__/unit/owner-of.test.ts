import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallOwnerOfOutput } from '@/plugins/contract-erc721/commands/owner-of/output';

import { ZodError } from 'zod';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_EVM_ADDRESS_RAW,
} from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { makeContractErc721CallCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { ownerOfFunctionCall } from '@/plugins/contract-erc721/commands/owner-of/handler';
import { ContractErc721CallOwnerOfInputSchema } from '@/plugins/contract-erc721/commands/owner-of/input';

jest.mock('@hashgraph/sdk', () => ({
  ContractId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    })),
  },
  AccountId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => MOCK_EVM_ADDRESS_RAW),
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
          .mockReturnValue({ entityIdOrEvmAddress: MOCK_CONTRACT_ID }),
        resolveAccount: jest.fn(),
        resolveContract: jest.fn(),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: MOCK_CONTRACT_ID,
          queryResult: [MOCK_EVM_ADDRESS],
        }),
      },
      alias: {
        resolveByEvmAddress: jest.fn().mockReturnValue({
          alias: 'owner-alias',
          entityId: MOCK_ACCOUNT_ID,
          type: 'account',
          network: SupportedNetwork.TESTNET,
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

    const result = await ownerOfFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallOwnerOfOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.owner).toBe(MOCK_EVM_ADDRESS);
    expect(output.ownerAlias).toBe('owner-alias');
    expect(output.ownerEntityId).toBe(MOCK_ACCOUNT_ID);
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
        contract: MOCK_CONTRACT_ID,
        tokenId,
      },
    });

    const result = await ownerOfFunctionCall(args);

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
        functionName: 'ownerOf',
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

    await expect(ownerOfFunctionCall(args)).rejects.toThrow(StateError);
    await expect(ownerOfFunctionCall(args)).rejects.toThrow(
      `There was a problem with decoding contract ${MOCK_CONTRACT_ID} "ownerOf" function result`,
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

    await expect(ownerOfFunctionCall(args)).rejects.toThrow(
      'contract query error',
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
