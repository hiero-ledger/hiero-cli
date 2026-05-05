import type { CoreApi, Logger } from '@/core';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { StateError } from '@/core/errors';
import { makeContractErc20CallCommandArgs } from '@/plugins/contract-erc20/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc20/__tests__/unit/helpers/mocks';
import { ContractErc20CallNameOutputSchema } from '@/plugins/contract-erc20/commands/name';
import { contractErc20Name } from '@/plugins/contract-erc20/commands/name/handler';
import { ContractErc20CallNameInputSchema } from '@/plugins/contract-erc20/commands/name/input';

jest.mock('@hiero-ledger/sdk', () => ({
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

describe('contract-erc20 plugin - name command (unit)', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: '0.0.1234',
          queryResult: ['MyToken'],
        }),
      },
    }).api;
  });

  test('calls ERC-20 name successfully and returns expected output', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });

    const result = await contractErc20Name(args);

    expect(result.result).toBeDefined();

    const parsed = assertOutput(
      result.result,
      ContractErc20CallNameOutputSchema,
    );

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.contractName).toBe('MyToken');
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
      }),
    );
  });

  test('throws StateError when contractQuery returns empty queryResult', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    await expect(contractErc20Name(args)).rejects.toThrow(StateError);
  });

  test('throws when queryContractFunction throws', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    await expect(contractErc20Name(args)).rejects.toThrow(
      'contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallNameInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
