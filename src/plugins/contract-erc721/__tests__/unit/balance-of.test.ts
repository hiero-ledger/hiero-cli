import type { CoreApi, Logger } from '@/core';
import type { ContractErc721CallBalanceOfOutput } from '@/plugins/contract-erc721/commands/balance-of/output';

import { ZodError } from 'zod';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_EVM_ADDRESS_RAW,
} from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  makeContractErc721CallCommandArgs,
  MOCK_CONTRACT_ID_ALT,
} from '@/plugins/contract-erc721/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';
import { balanceOfFunctionCall } from '@/plugins/contract-erc721/commands/balance-of/handler';
import { ContractErc721CallBalanceOfInputSchema } from '@/plugins/contract-erc721/commands/balance-of/input';

jest.mock('@hashgraph/sdk', () => ({
  ContractId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => MOCK_EVM_ADDRESS_RAW),
    })),
  },
  AccountId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => MOCK_EVM_ADDRESS_RAW),
    })),
  },
  TokenType: {
    NonFungibleUnique: 'NonFungibleUnique',
    FungibleCommon: 'FungibleCommon',
  },
}));

describe('contract-erc721 plugin - balanceOf command (unit)', () => {
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
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: MOCK_ACCOUNT_ID,
          accountPublicKey: 'pub-key',
          evmAddress: MOCK_EVM_ADDRESS,
        }),
        resolveContract: jest.fn(),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: MOCK_CONTRACT_ID,
          queryResult: [5000000000000000000n],
        }),
      },
    }).api;
  });

  test('calls ERC-721 balanceOf successfully and returns expected output', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: MOCK_EVM_ADDRESS,
      },
    });

    const result = await balanceOfFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallBalanceOfOutput;
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.owner).toBe(MOCK_EVM_ADDRESS);
    expect(output.balance).toBe('5000000000000000000');
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
        functionName: 'balanceOf',
        args: [MOCK_EVM_ADDRESS],
      }),
    );
  });

  test('calls ERC-721 balanceOf with owner as entity ID and resolves to EVM address', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: MOCK_ACCOUNT_ID,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: MOCK_ACCOUNT_ID,
        accountPublicKey: 'pub-key',
        evmAddress: MOCK_EVM_ADDRESS,
      },
    );

    const result = await balanceOfFunctionCall(args);

    expect(result.result).toBeDefined();
    const output = result.result as ContractErc721CallBalanceOfOutput;
    expect(output.owner).toBe(MOCK_EVM_ADDRESS);
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [MOCK_EVM_ADDRESS],
      }),
    );
  });

  test('calls ERC-721 balanceOf with account as alias and resolves to EVM address', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: 'my-account-alias',
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue(
      {
        accountId: MOCK_CONTRACT_ID_ALT,
        accountPublicKey: 'pub-key-alias',
        evmAddress: MOCK_EVM_ADDRESS,
      },
    );

    const result = await balanceOfFunctionCall(args);

    expect(result.result).toBeDefined();
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'my-account-alias',
      type: expect.any(String),
      network: SupportedNetwork.TESTNET,
    });
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [MOCK_EVM_ADDRESS],
      }),
    );
  });

  test('throws StateError when contractQuery returns empty queryResult', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: MOCK_EVM_ADDRESS,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: MOCK_CONTRACT_ID,
      queryResult: [],
    });

    await expect(balanceOfFunctionCall(args)).rejects.toThrow(StateError);
    await expect(balanceOfFunctionCall(args)).rejects.toThrow(
      `There was a problem with decoding contract ${MOCK_CONTRACT_ID} "balanceOf" function result`,
    );
  });

  test('propagates error when queryContractFunction throws', async () => {
    const args = makeContractErc721CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-alias-or-id',
        owner: MOCK_EVM_ADDRESS,
      },
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    await expect(balanceOfFunctionCall(args)).rejects.toThrow(
      'contract query error',
    );
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc721CallBalanceOfInputSchema.parse({ owner: MOCK_EVM_ADDRESS });
    }).toThrow(ZodError);
  });

  test('schema validation fails when account is missing', () => {
    expect(() => {
      ContractErc721CallBalanceOfInputSchema.parse({
        contract: 'some-alias-or-id',
      });
    }).toThrow(ZodError);
  });
});
