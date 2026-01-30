import type { AliasService, CommandHandlerArgs, CoreApi } from '@/core';
import type { ContractErc20CallDecimalsOutput } from '@/plugins/contract-erc20/commands/decimals/output';

import { ZodError } from 'zod';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { decimals as erc20DecimalsHandler } from '@/plugins/contract-erc20/commands/decimals/handler';
import { ContractErc20CallDecimalsInputSchema } from '@/plugins/contract-erc20/commands/decimals/input';

jest.mock('@hashgraph/sdk', () => ({
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

const mockEncodeFunctionData = jest.fn().mockReturnValue('0xencoded');
const mockDecodeFunctionResult = jest.fn().mockReturnValue([18] as unknown[]);

jest.mock('@/plugins/contract-erc20/utils/erc20-abi-resolver', () => ({
  getAbiErc20Interface: jest.fn(() => ({
    encodeFunctionData: mockEncodeFunctionData,
    decodeFunctionResult: mockDecodeFunctionResult,
  })),
}));

jest.mock('@/core/utils/contract-resolver', () => ({
  resolveContractId: jest.fn(() => '0.0.1234'),
}));

describe('contract-erc20 plugin - decimals command (unit)', () => {
  let api: CommandHandlerArgs['api'];
  let logger: ReturnType<typeof makeLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = makeLogger();

    api = {
      network: {
        getCurrentNetwork: jest.fn(() => 'testnet'),
      },
      alias: {} as unknown as AliasService,
      mirror: {
        postContractCall: jest.fn(),
      },
    } as unknown as CoreApi;
  });

  test('calls ERC-20 decimals successfully and returns expected output', async () => {
    (api.mirror.postContractCall as jest.Mock).mockResolvedValue({
      result: '0xencodedResult',
    });

    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20DecimalsHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallDecimalsOutput;

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.decimals).toBe('18');
    expect(parsed.network).toBe('testnet');

    expect(mockEncodeFunctionData).toHaveBeenCalledWith('decimals');
    expect(api.mirror.postContractCall).toHaveBeenCalledWith({
      to: `0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
      data: '0xencoded',
    });
    expect(mockDecodeFunctionResult).toHaveBeenCalledWith(
      'decimals',
      '0xencodedResult',
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Calling ERC-20 "decimals" function on contract 0.0.1234 (network: testnet)',
    );
  });

  test('returns failure when mirror returns no result', async () => {
    (api.mirror.postContractCall as jest.Mock).mockResolvedValue({});

    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20DecimalsHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with calling contract 0.0.1234 "decimals" function',
    );
  });

  test('returns failure when decodeFunctionResult returns empty array', async () => {
    (api.mirror.postContractCall as jest.Mock).mockResolvedValue({
      result: '0xencodedResult',
    });
    mockDecodeFunctionResult.mockReturnValueOnce([]);

    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20DecimalsHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "decimals" function result',
    );
  });

  test('returns failure when postContractCall throws', async () => {
    (api.mirror.postContractCall as jest.Mock).mockRejectedValue(
      new Error('mirror node error'),
    );

    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20DecimalsHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call "decimals" function: mirror node error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallDecimalsInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
