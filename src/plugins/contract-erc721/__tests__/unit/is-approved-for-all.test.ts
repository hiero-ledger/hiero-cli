import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallIsApprovedForAllOutput } from '@/plugins/contract-erc721/commands/is-approved-for-all/output';

import { ZodError } from 'zod';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_EVM_ADDRESS_ALT,
} from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError, StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  makeContractErc721CallCommandArgs,
  MOCK_ACCOUNT_ID_FROM,
  MOCK_ACCOUNT_ID_TO,
} from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { isApprovedForAllFunctionCall } from '@/plugins/contract-erc721/commands/is-approved-for-all/handler';
import { ContractErc721CallIsApprovedForAllInputSchema } from '@/plugins/contract-erc721/commands/is-approved-for-all/input';

describe('contract-erc721 plugin - isApprovedForAll command (unit)', () => {
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
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: MOCK_ACCOUNT_ID,
          accountPublicKey: 'pub-key',
          evmAddress: MOCK_EVM_ADDRESS,
        }),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: MOCK_CONTRACT_ID,
          queryResult: [true],
        }),
      },
    }).api;
  });

  test('calls ERC-721 isApprovedForAll successfully and returns expected output', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: MOCK_EVM_ADDRESS,
        operator: MOCK_EVM_ADDRESS_ALT,
      },
    });

    const result = await isApprovedForAllFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallIsApprovedForAllOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.owner).toBe(MOCK_EVM_ADDRESS);
    expect(output.operator).toBe(MOCK_EVM_ADDRESS_ALT);
    expect(output.isApprovedForAll).toBe(true);
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
        functionName: 'isApprovedForAll',
        args: [MOCK_EVM_ADDRESS, MOCK_EVM_ADDRESS_ALT],
      }),
    );
  });

  test('resolves owner and operator from entity IDs to EVM addresses', async () => {
    const resolvedOwner = MOCK_EVM_ADDRESS;
    const resolvedOperator = MOCK_EVM_ADDRESS_ALT;

    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: MOCK_ACCOUNT_ID_FROM,
        operator: MOCK_ACCOUNT_ID_TO,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID_FROM,
        accountPublicKey: 'pub-key-owner',
        evmAddress: resolvedOwner,
      })
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID_TO,
        accountPublicKey: 'pub-key-operator',
        evmAddress: resolvedOperator,
      });

    const result = await isApprovedForAllFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledTimes(2);
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [resolvedOwner, resolvedOperator],
      }),
    );
  });

  test('throws StateError when contractQuery returns empty queryResult', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: MOCK_EVM_ADDRESS,
        operator: MOCK_EVM_ADDRESS_ALT,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: MOCK_CONTRACT_ID,
      queryResult: [],
    });

    await expect(isApprovedForAllFunctionCall(args)).rejects.toThrow(
      StateError,
    );
    await expect(isApprovedForAllFunctionCall(args)).rejects.toThrow(
      `There was a problem with decoding contract ${MOCK_CONTRACT_ID} "isApprovedForAll" function result`,
    );
  });

  test('propagates error when queryContractFunction throws', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: MOCK_EVM_ADDRESS,
        operator: MOCK_EVM_ADDRESS_ALT,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    await expect(isApprovedForAllFunctionCall(args)).rejects.toThrow(
      'contract query error',
    );
  });

  test('throws NotFoundError when owner has no evmAddress', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: 'owner-alias',
        operator: MOCK_EVM_ADDRESS_ALT,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID_FROM,
        accountPublicKey: 'pub-key-owner',
        evmAddress: undefined,
      })
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID_TO,
        accountPublicKey: 'pub-key-operator',
        evmAddress: MOCK_EVM_ADDRESS_ALT,
      });

    const promise = isApprovedForAllFunctionCall(args);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow(
      /Couldn't resolve EVM address for an account/,
    );
  });

  test('throws NotFoundError when operator has no evmAddress', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: 'owner-alias',
        operator: 'operator-alias',
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID_FROM,
        accountPublicKey: 'pub-key-owner',
        evmAddress: MOCK_EVM_ADDRESS,
      })
      .mockResolvedValueOnce({
        accountId: MOCK_ACCOUNT_ID_TO,
        accountPublicKey: 'pub-key-operator',
        evmAddress: undefined,
      });

    const promise = isApprovedForAllFunctionCall(args);
    await expect(promise).rejects.toThrow(NotFoundError);
    await expect(promise).rejects.toThrow(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallIsApprovedForAllInputSchema.parse({
        owner: MOCK_EVM_ADDRESS,
        operator: MOCK_EVM_ADDRESS_ALT,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when owner is missing', () => {
    expect(() => {
      ContractErc721CallIsApprovedForAllInputSchema.parse({
        contract: 'some-alias-or-id',
        operator: MOCK_EVM_ADDRESS_ALT,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when operator is missing', () => {
    expect(() => {
      ContractErc721CallIsApprovedForAllInputSchema.parse({
        contract: 'some-alias-or-id',
        owner: MOCK_EVM_ADDRESS,
      });
    }).toThrow(ZodError);
  });
});
