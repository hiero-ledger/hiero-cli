import type { AliasService, CommandHandlerArgs, CoreApi } from '@/core';
import type { ContractErc20CallSymbolOutput } from '@/plugins/contract-erc20/commands/symbol/output';

import { ZodError } from 'zod';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { symbol as erc20SymbolHandler } from '@/plugins/contract-erc20/commands/symbol/handler';
import { ContractErc20CallSymbolInputSchema } from '@/plugins/contract-erc20/commands/symbol/input';

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
const mockDecodeFunctionResult = jest
  .fn()
  .mockReturnValue(['HBAR'] as unknown[]);

jest.mock('@/plugins/contract-erc20/utils/erc20-abi-resolver', () => ({
  getAbiErc20Interface: jest.fn(() => ({
    encodeFunctionData: mockEncodeFunctionData,
    decodeFunctionResult: mockDecodeFunctionResult,
  })),
}));

jest.mock('@/core/utils/contract-resolver', () => ({
  resolveContractId: jest.fn(() => '0.0.1234'),
}));

describe('contract-erc20 plugin - symbol command (unit)', () => {
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

  test('calls ERC-20 symbol successfully and returns expected output', async () => {
    (api.mirror.postContractCall as jest.Mock).mockResolvedValue({
      result: '0xencodedResult',
    });

    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20SymbolHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallSymbolOutput;

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.contractSymbol).toBe('HBAR');
    expect(parsed.network).toBe('testnet');

    expect(mockEncodeFunctionData).toHaveBeenCalledWith('symbol');
    expect(api.mirror.postContractCall).toHaveBeenCalledWith({
      to: `0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
      data: '0xencoded',
    });
    expect(mockDecodeFunctionResult).toHaveBeenCalledWith(
      'symbol',
      '0xencodedResult',
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Calling ERC-20 "symbol" function on contract 0.0.1234 (network: testnet)',
    );
  });

  test('returns failure when mirror returns no result', async () => {
    (api.mirror.postContractCall as jest.Mock).mockResolvedValue({});

    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20SymbolHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with calling contract 0.0.1234 "symbol" function',
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

    const result = await erc20SymbolHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "symbol" function result',
    );
  });

  test('returns failure when postContractCall throws', async () => {
    (api.mirror.postContractCall as jest.Mock).mockRejectedValue(
      new Error('mirror node error'),
    );

    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });

    const result = await erc20SymbolHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call "symbol" function: mirror node error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallSymbolInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
