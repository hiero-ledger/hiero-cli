import type { CoreApi } from '@/core';
import type { ContractErc20CallTotalSupplyOutput } from '@/plugins/contract-erc20/commands/total-supply/output';

import { ZodError } from 'zod';

import { makeAliasMock, makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { ContractType } from '@/core/types/shared.types';
import { totalSupplyFunctionCall as erc20TotalSupplyHandler } from '@/plugins/contract-erc20/commands/total-supply/handler';
import { ContractErc20CallTotalSupplyInputSchema } from '@/plugins/contract-erc20/commands/total-supply/input';

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

describe('contract-erc20 plugin - total-supply command (unit)', () => {
  let api: CoreApi;
  let logger: ReturnType<typeof makeLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = makeLogger();

    const alias = makeAliasMock();
    (alias.resolveEntityId as jest.Mock).mockReturnValue('0.0.1234');
    api = {
      network: {
        getCurrentNetwork: jest.fn(() => 'testnet'),
      },
      alias,
      mirror: {
        postContractCall: jest.fn(),
      },
    } as unknown as CoreApi;
  });

  test('calls ERC-20 totalSupply successfully and returns expected output', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (
      args.api.contractCall.callMirrorNodeFunction as jest.Mock
    ).mockResolvedValue(1000000n);

    const result = await erc20TotalSupplyHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallTotalSupplyOutput;

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.totalSupply).toBe('1000000');
    expect(parsed.network).toBe('testnet');

    expect(args.api.contractCall.callMirrorNodeFunction).toHaveBeenCalledWith({
      contractType: ContractType.ERC20,
      functionName: 'totalSupply',
      contractId: '0.0.1234',
      args: [],
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Calling ERC-20 totalSupply function on contract 0.0.1234 (network: testnet)',
    );
  });

  test('returns failure when mirror returns no result', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (
      args.api.contractCall.callMirrorNodeFunction as jest.Mock
    ).mockRejectedValue(
      new Error(
        'There was a problem with calling contract 0.0.1234 "totalSupply" function',
      ),
    );

    const result = await erc20TotalSupplyHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with calling contract 0.0.1234 "totalSupply" function',
    );
  });

  test('returns failure when decode returns empty', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (
      args.api.contractCall.callMirrorNodeFunction as jest.Mock
    ).mockRejectedValue(
      new Error(
        'There was a problem with decoding contract 0.0.1234 "totalSupply" function result',
      ),
    );

    const result = await erc20TotalSupplyHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract 0.0.1234 "totalSupply" function result',
    );
  });

  test('returns failure when callMirrorNodeFunction throws', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (
      args.api.contractCall.callMirrorNodeFunction as jest.Mock
    ).mockRejectedValue(new Error('mirror node error'));

    const result = await erc20TotalSupplyHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call totalSupply function: mirror node error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallTotalSupplyInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
