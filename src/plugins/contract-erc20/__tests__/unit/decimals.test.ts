import type { CoreApi, Logger } from '@/core';

import '@/core/utils/json-serialize';

import { ZodError } from 'zod';

import { makeHederaSdkContractMock } from '@/__tests__/mocks/hedera-sdk-contract-mock';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { makeContractErc20CallCommandArgs } from '@/plugins/contract-erc20/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc20/__tests__/unit/helpers/mocks';
import { ContractErc20CallDecimalsOutputSchema } from '@/plugins/contract-erc20/commands/decimals';
import { contractErc20Decimals } from '@/plugins/contract-erc20/commands/decimals/handler';
import { ContractErc20CallDecimalsInputSchema } from '@/plugins/contract-erc20/commands/decimals/input';

jest.mock('@hiero-ledger/sdk', () => makeHederaSdkContractMock());

describe('contract-erc20 plugin - decimals command (unit)', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks().api;
  });

  test('calls ERC-20 decimals successfully and returns expected output', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });

    const result = await contractErc20Decimals(args);

    expect(result.result).toBeDefined();

    const parsed = assertOutput(
      result.result,
      ContractErc20CallDecimalsOutputSchema,
    );

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.decimals).toBe(18);
    expect(parsed.network).toBe(SupportedNetwork.TESTNET);

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
        contractIdOrEvmAddress: '0.0.1234',
        functionName: 'decimals',
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

    await expect(contractErc20Decimals(args)).rejects.toThrow(StateError);
  });

  test('throws when queryContractFunction throws', async () => {
    const args = makeContractErc20CallCommandArgs({ api, logger });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    await expect(contractErc20Decimals(args)).rejects.toThrow(
      'contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallDecimalsInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
