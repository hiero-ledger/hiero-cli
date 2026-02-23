import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallGetApprovedOutput } from '@/plugins/contract-erc721/commands/get-approved/output';

import { ZodError } from 'zod';

import { MOCK_ACCOUNT_ID, MOCK_CONTRACT_ID } from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { makeContractErc721CallCommandArgs } from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { getApprovedFunctionCall } from '@/plugins/contract-erc721/commands/get-approved/handler';
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
          .mockReturnValue({ entityIdOrEvmAddress: MOCK_CONTRACT_ID }),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: MOCK_CONTRACT_ID,
          queryResult: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
        }),
      },
      alias: {
        resolveByEvmAddress: jest.fn().mockReturnValue({
          alias: 'approved-alias',
          entityId: MOCK_ACCOUNT_ID,
          type: 'account',
          network: SupportedNetwork.TESTNET,
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

    const result = await getApprovedFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallGetApprovedOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.tokenId).toBe(tokenId);
    expect(output.approved).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    expect(output.approvedAlias).toBe('approved-alias');
    expect(output.approvedEntityId).toBe(MOCK_ACCOUNT_ID);
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
        functionName: 'getApproved',
        args: [tokenId],
      }),
    );
  });

  test('throws StateError when contractQuery returns empty queryResult', async () => {
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
      contractId: MOCK_CONTRACT_ID,
      queryResult: [],
    });

    await expect(getApprovedFunctionCall(args)).rejects.toThrow(StateError);
    await expect(getApprovedFunctionCall(args)).rejects.toThrow(
      `There was a problem with decoding contract ${MOCK_CONTRACT_ID} "getApproved" function result`,
    );
  });

  test('propagates error when queryContractFunction throws', async () => {
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

    await expect(getApprovedFunctionCall(args)).rejects.toThrow(
      'contract query error',
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
