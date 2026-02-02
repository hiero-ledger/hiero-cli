import type { CoreApi, Logger } from '@/core';
import type { ContractErc20CallAllowanceOutput } from '@/plugins/contract-erc20/commands/allowance/output';

import { ZodError } from 'zod';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { allowanceFunctionCall as erc20AllowanceHandler } from '@/plugins/contract-erc20/commands/allowance/handler';
import { ContractErc20CallAllowanceInputSchema } from '@/plugins/contract-erc20/commands/allowance/input';

const CONTRACT_ID = '0.0.1234';
const OWNER_EVM = '0x' + 'a'.repeat(40);
const SPENDER_EVM = '0x' + 'b'.repeat(40);
const OWNER_ACCOUNT_ID = '0.0.5678';
const SPENDER_ACCOUNT_ID = '0.0.5679';

describe('contract-erc20 plugin - allowance command (unit)', () => {
  let api: CoreApi;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = makeLogger();

    api = {
      network: {
        getCurrentNetwork: jest.fn(() => 'testnet'),
      },
      alias: {
        resolveOrThrow: jest
          .fn()
          .mockImplementation((value: string, type: string) => {
            if (type === 'contract') {
              return {
                entityId: CONTRACT_ID,
                alias: value,
                type: 'contract',
                network: 'testnet',
                createdAt: '2024-01-01T00:00:00.000Z',
              };
            }
            const entityId =
              value === 'owner-alias' ? OWNER_ACCOUNT_ID : SPENDER_ACCOUNT_ID;
            return {
              entityId,
              alias: value,
              type: 'account',
              network: 'testnet',
              createdAt: '2024-01-01T00:00:00.000Z',
            };
          }),
      },
      mirror: {
        getContractInfo: jest.fn(),
        getAccount: jest.fn().mockImplementation((accountId: string) => {
          const evm = accountId === OWNER_ACCOUNT_ID ? OWNER_EVM : SPENDER_EVM;
          return Promise.resolve({ evmAddress: evm });
        }),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: CONTRACT_ID,
          queryResult: [1000n],
        }),
      },
    } as unknown as CoreApi;
  });

  test('calls ERC-20 allowance successfully with EVM addresses for owner and spender', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-contract',
      owner: OWNER_EVM,
      spender: SPENDER_EVM,
    });

    const result = await erc20AllowanceHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallAllowanceOutput;

    expect(parsed.contractId).toBe(CONTRACT_ID);
    expect(parsed.owner).toBe(OWNER_EVM);
    expect(parsed.spender).toBe(SPENDER_EVM);
    expect(parsed.allowance).toBe('1000');
    expect(parsed.network).toBe('testnet');

    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        contractIdOrEvmAddress: CONTRACT_ID,
        functionName: 'allowance',
        args: [OWNER_EVM, SPENDER_EVM],
      }),
    );
    expect(args.api.mirror.getAccount).not.toHaveBeenCalled();
  });

  test('calls ERC-20 allowance successfully with aliases for owner and spender', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-contract',
      owner: 'owner-alias',
      spender: 'spender-alias',
    });

    const result = await erc20AllowanceHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(result.outputJson);

    expect(parsed.owner).toBe(OWNER_EVM);
    expect(parsed.spender).toBe(SPENDER_EVM);
    expect(parsed.allowance).toBe('1000');

    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'owner-alias',
      'account',
      'testnet',
    );
    expect(args.api.alias.resolveOrThrow).toHaveBeenCalledWith(
      'spender-alias',
      'account',
      'testnet',
    );
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(OWNER_ACCOUNT_ID);
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(SPENDER_ACCOUNT_ID);
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [OWNER_EVM, SPENDER_EVM],
      }),
    );
  });

  test('calls ERC-20 allowance successfully with account IDs for owner and spender', async () => {
    const args = makeArgs(api, logger, {
      contract: '0.0.1234',
      owner: OWNER_ACCOUNT_ID,
      spender: SPENDER_ACCOUNT_ID,
    });

    const result = await erc20AllowanceHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(OWNER_ACCOUNT_ID);
    expect(args.api.mirror.getAccount).toHaveBeenCalledWith(SPENDER_ACCOUNT_ID);
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-contract',
      owner: OWNER_EVM,
      spender: SPENDER_EVM,
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockResolvedValue({
      contractId: CONTRACT_ID,
      queryResult: [],
    });

    const result = await erc20AllowanceHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'There was a problem with decoding contract',
    );
    expect(result.errorMessage).toContain('allowance');
  });

  test('returns failure when queryContractFunction throws', async () => {
    const args = makeArgs(api, logger, {
      contract: 'some-contract',
      owner: OWNER_EVM,
      spender: SPENDER_EVM,
    });
    (
      args.api.contractQuery.queryContractFunction as jest.Mock
    ).mockRejectedValue(new Error('contract query error'));

    const result = await erc20AllowanceHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'Failed to call allowance function: contract query error',
    );
  });

  test('schema validation fails when owner is missing', () => {
    expect(() => {
      ContractErc20CallAllowanceInputSchema.parse({
        contract: '0.0.1234',
        spender: SPENDER_EVM,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when spender is missing', () => {
    expect(() => {
      ContractErc20CallAllowanceInputSchema.parse({
        contract: '0.0.1234',
        owner: OWNER_EVM,
      });
    }).toThrow(ZodError);
  });

  test('schema validation fails when contract is missing', () => {
    expect(() => {
      ContractErc20CallAllowanceInputSchema.parse({
        owner: OWNER_EVM,
        spender: SPENDER_EVM,
      });
    }).toThrow(ZodError);
  });
});
