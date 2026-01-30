import type { CommandHandlerArgs, CoreApi } from '@/core';
import type { ContractErc20CallNameOutput } from '@/plugins/contract-erc20/commands/name/output';

import { Interface } from 'ethers';
import { ZodError } from 'zod';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { nameFunctionCall as erc20NameHandler } from '@/plugins/contract-erc20/commands/name/handler';
import { ContractErc20CallNameInputSchema } from '@/plugins/contract-erc20/commands/name/input';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

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

const EVM_ADDRESS = '0x' + 'a'.repeat(40);

describe('contract-erc20 plugin - name command (unit)', () => {
  let api: CommandHandlerArgs['api'];
  let logger: ReturnType<typeof makeLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = makeLogger();

    api = {
      network: {
        getCurrentNetwork: jest.fn(() => 'testnet'),
      },
      identifierResolver: {
        resolveEntityId: jest.fn().mockReturnValue({ entityId: '0.0.1234' }),
      },
      mirror: {
        getContractInfo: jest.fn().mockResolvedValue({
          evm_address: EVM_ADDRESS,
        }),
        postContractCall: jest.fn(),
      },
    } as unknown as CoreApi;
  });

  test('calls ERC-20 name successfully and returns expected output', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    const iface = new Interface(ERC20_ABI);
    const encodedResult = iface.encodeFunctionResult('name', ['MyToken']);
    (args.api.mirror.postContractCall as jest.Mock).mockResolvedValue({
      result: encodedResult,
    });

    const result = await erc20NameHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallNameOutput;

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.contractName).toBe('MyToken');
    expect(parsed.network).toBe('testnet');

    expect(args.api.identifierResolver.resolveEntityId).toHaveBeenCalledWith({
      entityIdOrAlias: 'some-alias-or-id',
      type: 'contract',
      network: 'testnet',
    });
    expect(args.api.mirror.getContractInfo).toHaveBeenCalledWith('0.0.1234');
    expect(args.api.mirror.postContractCall).toHaveBeenCalledWith({
      to: EVM_ADDRESS,
      data: expect.any(String),
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Calling contract 0.0.1234 "name" function on mirror node',
    );
  });

  test('returns failure when mirror returns no result', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (args.api.mirror.postContractCall as jest.Mock).mockResolvedValue({});

    const result = await erc20NameHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with calling contract 0.0.1234 "name" function',
    );
  });

  test('returns failure when decode fails (invalid result hex)', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (args.api.mirror.postContractCall as jest.Mock).mockResolvedValue({
      result: '0xinvalid',
    });

    const result = await erc20NameHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to call name function');
  });

  test('returns failure when postContractCall throws', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-alias-or-id',
    });
    (args.api.mirror.postContractCall as jest.Mock).mockRejectedValue(
      new Error('mirror node error'),
    );

    const result = await erc20NameHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call name function: mirror node error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallNameInputSchema.parse({});
    }).toThrow(ZodError);
  });
});
