import type { CoreApi, Logger } from '@/core';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { makeContractErc721CallCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { getApprovedFunctionCall as erc721GetApprovedHandler } from '@/plugins/contract-erc721/commands/get-approved/handler';
import { ContractErc721CallGetApprovedInputSchema } from '@/plugins/contract-erc721/commands/get-approved/input';

describe('contract-erc721 plugin - getApproved command (unit)', () => {
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
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: '0.0.1234',
          queryResult: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
        }),
      },
      alias: {
        resolveByEvmAddress: jest.fn().mockReturnValue({
          alias: 'approved-alias',
          entityId: '0.0.5678',
          type: 'account',
          network: 'testnet',
        }),
      },
    }).api;
  });

  test('calls ERC-721 getApproved successfully and returns expected output', async () => {
    const tokenId = 42;
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        tokenId,
      },
    });

    const result = await erc721GetApprovedHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    if (result.outputJson === undefined) {
      throw new Error('Expected outputJson to be defined');
    }
    const parsed = JSON.parse(result.outputJson);

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.tokenId).toBe(tokenId);
    expect(parsed.approved).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    expect(parsed.approvedAlias).toBe('approved-alias');
    expect(parsed.approvedEntityId).toBe('0.0.5678');
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
        functionName: 'getApproved',
        args: [tokenId],
      }),
    );
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const tokenId = 7;
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        tokenId,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    const result = await erc721GetApprovedHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "getApproved" function result',
    );
  });

  test('returns failure when queryContractFunction throws', async () => {
    const tokenId = 1;
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        tokenId,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc721GetApprovedHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call getApproved function: contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallGetApprovedInputSchema.parse({
        tokenId: 1,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when tokenId is missing', () => {
    expect(() => {
      ContractErc721CallGetApprovedInputSchema.parse({
        contract: 'some-alias-or-id',
      });
    }).toThrow(ZodError);
  });
});
