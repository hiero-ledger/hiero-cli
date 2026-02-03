import type { ContractListOutput } from '@/plugins/contract/commands/list/output';

import { makeArgs } from '@/__tests__/mocks/mocks';
import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { listContracts } from '@/plugins/contract/commands/list/handler';
import { ContractListOutputSchema } from '@/plugins/contract/commands/list/output';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';
import {
  makeApiMocks,
  makeLogger,
} from '@/plugins/token/__tests__/unit/helpers/mocks';

jest.mock('@/plugins/contract/zustand-state-helper', () => ({
  ZustandContractStateHelper: jest.fn(),
}));

const MockedHelper = ZustandContractStateHelper as jest.Mock;

const NETWORK_TESTNET = SupportedNetwork.TESTNET;
const NETWORK_MAINNET = SupportedNetwork.MAINNET;

describe('contract plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty list when no contracts exist', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listContracts: jest.fn().mockReturnValue([]),
    }));

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });

    const args = makeArgs(api, logger, {});

    const result = await listContracts(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: ContractListOutput = validateOutputSchema(
      result.outputJson!,
      ContractListOutputSchema,
    );
    expect(output.contracts).toHaveLength(0);
    expect(output.totalCount).toBe(0);
  });

  test('lists contracts and includes aliases', async () => {
    const logger = makeLogger();

    const contracts = [
      {
        contractId: '0.0.1001',
        contractName: 'ContractOne',
        contractEvmAddress: '0x1111111111111111111111111111111111111111',
        adminPublicKey: 'admin-key-1',
        network: NETWORK_TESTNET,
      },
      {
        contractId: '0.0.2002',
        contractName: 'ContractTwo',
        contractEvmAddress: '0x2222222222222222222222222222222222222222',
        network: NETWORK_MAINNET,
      },
    ];

    MockedHelper.mockImplementation(() => ({
      listContracts: jest.fn().mockReturnValue(contracts),
    }));

    const { api } = makeApiMocks({
      network: SupportedNetwork.TESTNET,
      alias: {
        resolve: jest
          .fn()
          .mockImplementation(
            (
              ref: string,
              type: string | undefined,
              network: SupportedNetwork,
            ) => {
              if (ref === '0.0.1001' && type === 'contract') {
                if (network === SupportedNetwork.TESTNET) {
                  return {
                    alias: 'contract-alias-one',
                    type: 'contract',
                    network: SupportedNetwork.TESTNET,
                    entityId: '0.0.1001',
                  };
                }
                if (network === SupportedNetwork.MAINNET) {
                  return null;
                }
              }
              return null;
            },
          ),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listContracts(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    expect(MockedHelper).toHaveBeenCalledTimes(1);
    const output: ContractListOutput = validateOutputSchema(
      result.outputJson!,
      ContractListOutputSchema,
    );

    expect(output.contracts).toHaveLength(2);
    expect(output.totalCount).toBe(2);

    expect(output.contracts[0].contractId).toBe('0.0.1001');
    expect(output.contracts[0].contractName).toBe('ContractOne');
    expect(output.contracts[0].contractEvmAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(output.contracts[0].adminPublicKey).toBe('admin-key-1');
    expect(output.contracts[0].network).toBe(NETWORK_TESTNET);
    expect(output.contracts[0].alias).toBe('contract-alias-one');

    expect(output.contracts[1].contractId).toBe('0.0.2002');
    expect(output.contracts[1].contractName).toBe('ContractTwo');
    expect(output.contracts[1].contractEvmAddress).toBe(
      '0x2222222222222222222222222222222222222222',
    );
    expect(output.contracts[1].adminPublicKey).toBe(undefined);
    expect(output.contracts[1].network).toBe(NETWORK_MAINNET);
    expect(output.contracts[1].alias).toBe(undefined);
  });

  test('returns failure when listing contracts throws an error', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listContracts: jest.fn().mockImplementation(() => {
        throw new Error('database error');
      }),
    }));

    const { api } = makeApiMocks({
      network: SupportedNetwork.TESTNET,
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listContracts(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to list contracts');
    expect(result.outputJson).toBeUndefined();
  });
});
