import type { CoreApi, Logger } from '@/core';
import type { ContractErc20CallAllowanceOutput } from '@/plugins/contract-erc20/commands/allowance/output';

import { ZodError } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { makeContractErc20CallCommandArgs } from '@/plugins/contract-erc20/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract-erc20/__tests__/unit/helpers/mocks';
import { allowanceFunctionCall as erc20AllowanceHandler } from '@/plugins/contract-erc20/commands/allowance/handler';
import { ContractErc20CallAllowanceInputSchema } from '@/plugins/contract-erc20/commands/allowance/input';

const CONTRACT_ID = '0.0.1234';
const OWNER_EVM = '0x' + 'a'.repeat(40);
const SPENDER_EVM = '0x' + 'b'.repeat(40);
const OWNER_ACCOUNT_ID = '0.0.5678';
const SPENDER_ACCOUNT_ID = '0.0.5679';

describe('contract-erc20 plugin - allowance command (unit)', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      identityResolution: {
        resolveReferenceToEntityOrEvmAddress: jest.fn().mockReturnValue({
          entityIdOrEvmAddress: CONTRACT_ID,
        }),
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: OWNER_ACCOUNT_ID,
          accountPublicKey: 'pub-key',
          evmAddress: OWNER_EVM,
        }),
        resolveContract: jest.fn(),
      },
      contractQuery: {
        queryContractFunction: jest.fn().mockResolvedValue({
          contractId: CONTRACT_ID,
          queryResult: [1000n],
        }),
      },
    }).api;
  });

  test('calls ERC-20 allowance successfully with EVM addresses for owner and spender', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        owner: OWNER_EVM,
        spender: SPENDER_EVM,
      },
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
    expect(args.api.identityResolution.resolveAccount).not.toHaveBeenCalled();
  });

  test('calls ERC-20 allowance successfully with aliases for owner and spender', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        owner: 'owner-alias',
        spender: 'spender-alias',
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: OWNER_ACCOUNT_ID,
        accountPublicKey: 'pub-key-owner',
        evmAddress: OWNER_EVM,
      })
      .mockResolvedValueOnce({
        accountId: SPENDER_ACCOUNT_ID,
        accountPublicKey: 'pub-key-spender',
        evmAddress: SPENDER_EVM,
      });

    const result = await erc20AllowanceHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const parsed = JSON.parse(
      result.outputJson as string,
    ) as ContractErc20CallAllowanceOutput;

    expect(parsed.owner).toBe(OWNER_EVM);
    expect(parsed.spender).toBe(SPENDER_EVM);
    expect(parsed.allowance).toBe('1000');

    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'owner-alias',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'spender-alias',
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.contractQuery.queryContractFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [OWNER_EVM, SPENDER_EVM],
      }),
    );
  });

  test('calls ERC-20 allowance successfully with account IDs for owner and spender', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: '0.0.1234',
        owner: OWNER_ACCOUNT_ID,
        spender: SPENDER_ACCOUNT_ID,
      },
    });

    (args.api.identityResolution.resolveAccount as jest.Mock)
      .mockResolvedValueOnce({
        accountId: OWNER_ACCOUNT_ID,
        accountPublicKey: 'pub-key-owner',
        evmAddress: OWNER_EVM,
      })
      .mockResolvedValueOnce({
        accountId: SPENDER_ACCOUNT_ID,
        accountPublicKey: 'pub-key-spender',
        evmAddress: SPENDER_EVM,
      });

    const result = await erc20AllowanceHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: OWNER_ACCOUNT_ID,
      type: expect.any(String),
      network: 'testnet',
    });
    expect(args.api.identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: SPENDER_ACCOUNT_ID,
      type: expect.any(String),
      network: 'testnet',
    });
  });

  test('returns failure when contractQuery returns empty queryResult', async () => {
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        owner: OWNER_EVM,
        spender: SPENDER_EVM,
      },
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
    const args = makeContractErc20CallCommandArgs({
      api,
      logger,
      args: {
        contract: 'some-contract',
        owner: OWNER_EVM,
        spender: SPENDER_EVM,
      },
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
