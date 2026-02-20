import type { CoreApi, Logger } from '@/core';
import type { ContractErc20CallBalanceOfOutput } from '@/plugins/contract-erc20/commands/balance-of/output';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError, StateError } from '@/core/errors';
import { makeContractErc20CallCommandArgs } from '@/plugins/contract-erc20/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc20/__tests__/unit/helpers/mocks';
import { balanceOfFunctionCall as erc20BalanceOfHandler } from '@/plugins/contract-erc20/commands/balance-of/handler';
import { ContractErc20CallBalanceOfInputSchema } from '@/plugins/contract-erc20/commands/balance-of/input';

const mockSolidityAddress = '1234567890123456789012345678901234567890';
const accountAddress = '0x1234567890123456789012345678901234567890';

jest.mock('@hashgraph/sdk', () => ({
  ContractId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    })),
  },
  AccountId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => mockSolidityAddress),
    })),
  },
  TokenType: {
    NonFungibleUnique: 'NonFungibleUnique',
    FungibleCommon: 'FungibleCommon',
  },
}));

describe('contract-erc20 plugin - balanceOf command (unit)', () => {
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
          evmAddress: accountAddress,
        }),
        resolveContract: jest.fn(),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: '0.0.1234',
          queryResult: [5000000000000000000n],
        }),
      },
    }).api;
  });

  test('calls ERC-20 balanceOf successfully and returns expected output', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        account: accountAddress,
      },
    });

    const result = await erc20BalanceOfHandler(args);

    expect(result.result).toBeDefined();

    const parsed = result.result as ContractErc20CallBalanceOfOutput;

    expect(parsed.contractId).toBe('0.0.1234');
    expect(parsed.account).toBe(accountAddress);
    expect(parsed.balance).toBe('5000000000000000000');
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
        functionName: 'balanceOf',
        args: [accountAddress],
      }),
    );
  });

  test('calls ERC-20 balanceOf with account as entity ID and resolves to EVM address', async () => {
    const accountId = '0.0.5678';
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        account: accountId,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId,
        accountPublicKey: 'pub-key',
        evmAddress: `0x${mockSolidityAddress}`,
      },
    );

    const result = await erc20BalanceOfHandler(args);

    expect(result.result).toBeDefined();

    const parsed = result.result as ContractErc20CallBalanceOfOutput;

    expect(parsed.account).toBe(`0x${mockSolidityAddress}`);
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [`0x${mockSolidityAddress}`],
      }),
    );
  });

  test('calls ERC-20 balanceOf with account as alias and resolves to EVM address', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        account: 'my-account-alias',
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: '0.0.9999',
        accountPublicKey: 'pub-key-alias',
        evmAddress: `0x${mockSolidityAddress}`,
      },
    );

    const result = await erc20BalanceOfHandler(args);

    expect(result.result).toBeDefined();

    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'my-account-alias',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [`0x${mockSolidityAddress}`],
      }),
    );
  });

  test('throws StateError when contractQuery returns empty queryResult', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        account: accountAddress,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [],
    });

    await expect(erc20BalanceOfHandler(args)).rejects.toThrow(StateError);
  });

  test('throws when queryContractFunction throws', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        account: accountAddress,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    await expect(erc20BalanceOfHandler(args)).rejects.toThrow(
      'contract query error',
    );
  });

  test('throws NotFoundError when accountEvmAddress is not found', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        account: 'my-account-alias',
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: '0.0.9999',
        accountPublicKey: 'pub-key-alias',
        evmAddress: null,
      },
    );

    await expect(erc20BalanceOfHandler(args)).rejects.toThrow(NotFoundError);
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallBalanceOfInputSchema.parse({ account: accountAddress });
    }).toThrow(ZodError);
  });

  test('schema validation fails when account is missing', () => {
    expect(() => {
      ContractErc20CallBalanceOfInputSchema.parse({
        contract: 'some-alias-or-id',
      });
    }).toThrow(ZodError);
  });
});
