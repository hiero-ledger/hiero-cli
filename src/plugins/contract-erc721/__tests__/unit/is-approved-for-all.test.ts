import type { CoreApi, Logger } from '@/core';

import { ZodError } from 'zod';

import {
  MOCK_EVM_ADDRESS,
  MOCK_EVM_ADDRESS_ALT,
} from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { makeContractErc721CallCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { isApprovedForAllFunctionCall as erc721IsApprovedForAllHandler } from '@/plugins/contract-erc721/commands/is-approved-for-all/handler';
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
          .mockReturnValue({ entityIdOrEvmAddress: '0.0.1234' }),
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: '0.0.5678',
          accountPublicKey: 'pub-key',
          evmAddress: MOCK_EVM_ADDRESS,
        }),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: '0.0.1234',
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

    const result = await erc721IsApprovedForAllHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    if (result.outputJson === undefined) {
      throw new Error('Expected outputJson to be defined');
    }
    const parsed = JSON.parse(result.outputJson);

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.owner).toBe(MOCK_EVM_ADDRESS);
    expect(parsed.operator).toBe(MOCK_EVM_ADDRESS_ALT);
    expect(parsed.isApprovedForAll).toBe(true);
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
        functionName: 'isApprovedForAll',
        args: [MOCK_EVM_ADDRESS, MOCK_EVM_ADDRESS_ALT],
      }),
    );
  });

  test('resolves owner and operator from entity IDs to EVM addresses', async () => {
    const ownerId = '0.0.1111';
    const operatorId = '0.0.2222';
    const resolvedOwner = '0x' + 'a'.repeat(40);
    const resolvedOperator = '0x' + 'b'.repeat(40);

    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: ownerId,
        operator: operatorId,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: ownerId,
        accountPublicKey: 'pub-key-owner',
        evmAddress: resolvedOwner,
      })
      .mockResolvedValueOnce({
        accountId: operatorId,
        accountPublicKey: 'pub-key-operator',
        evmAddress: resolvedOperator,
      });

    const result = await erc721IsApprovedForAllHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledTimes(2);
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [resolvedOwner, resolvedOperator],
      }),
    );
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
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
      contractId: '0.0.1234',
      queryResult: [],
    });

    const result = await erc721IsApprovedForAllHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "isApprovedForAll" function result',
    );
  });

  test('returns failure when queryContractFunction throws', async () => {
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

    const result = await erc721IsApprovedForAllHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call isApprovedForAll function: contract query error',
    );
  });

  test('returns failure when owner has no evmAddress', async () => {
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
        accountId: '0.0.1111',
        accountPublicKey: 'pub-key-owner',
        evmAddress: undefined,
      })
      .mockResolvedValueOnce({
        accountId: '0.0.2222',
        accountPublicKey: 'pub-key-operator',
        evmAddress: MOCK_EVM_ADDRESS_ALT,
      });

    const result = await erc721IsApprovedForAllHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      "Couldn't resolve EVM address for an account",
    );
  });

  test('returns failure when operator has no evmAddress', async () => {
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
        accountId: '0.0.1111',
        accountPublicKey: 'pub-key-owner',
        evmAddress: MOCK_EVM_ADDRESS,
      })
      .mockResolvedValueOnce({
        accountId: '0.0.2222',
        accountPublicKey: 'pub-key-operator',
        evmAddress: undefined,
      });

    const result = await erc721IsApprovedForAllHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
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
