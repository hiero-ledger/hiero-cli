import {
  makeAliasMock,
  makeArgs,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';
import { makeContractStateServiceMock } from '@/plugins/contract/__tests__/unit/helpers/mocks';
import { ContractListOutputSchema } from '@/plugins/contract/commands/list';
import { ListContractsCommand } from '@/plugins/contract/commands/list/handler';

const NETWORK_TESTNET = SupportedNetwork.TESTNET;
const NETWORK_MAINNET = SupportedNetwork.MAINNET;

describe('contract plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty list when no contracts exist', async () => {
    const logger = makeLogger();
    const contractState = makeContractStateServiceMock({
      listContracts: jest.fn().mockReturnValue([]),
    });

    const api = {
      alias: makeAliasMock(),
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      logger: makeLogger(),
    };

    const args = makeArgs(api, logger, {});
    const result = await new ListContractsCommand(contractState).execute(args);

    const output = assertOutput(result.result, ContractListOutputSchema);
    expect(output.contracts).toHaveLength(0);
    expect(output.totalCount).toBe(0);
  });

  test('lists contracts and includes names', async () => {
    const logger = makeLogger();

    const contracts = [
      {
        contractId: '0.0.1001',
        name: 'contract-alias-one',
        contractEvmAddress: '0x1111111111111111111111111111111111111111',
        adminKeyRefIds: ['kr1'],
        adminKeyThreshold: 1,
        network: NETWORK_TESTNET,
      },
      {
        contractId: '0.0.2002',
        name: 'ContractTwo',
        contractEvmAddress: '0x2222222222222222222222222222222222222222',
        adminKeyRefIds: [],
        adminKeyThreshold: 0,
        network: NETWORK_MAINNET,
      },
    ];

    const contractState = makeContractStateServiceMock({
      listContracts: jest.fn().mockReturnValue(contracts),
    });

    const api = {
      alias: makeAliasMock(),
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      logger: makeLogger(),
    };
    const args = makeArgs(api, logger, {});

    const result = await new ListContractsCommand(contractState).execute(args);

    expect(contractState.listContracts).toHaveBeenCalledTimes(1);
    const output = assertOutput(result.result, ContractListOutputSchema);

    expect(output.contracts).toHaveLength(2);
    expect(output.totalCount).toBe(2);

    expect(output.contracts[0].contractId).toBe('0.0.1001');
    expect(output.contracts[0].name).toBe('contract-alias-one');
    expect(output.contracts[0].contractEvmAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(output.contracts[0].adminKeyPresent).toBe(true);
    expect(output.contracts[0].network).toBe(NETWORK_TESTNET);

    expect(output.contracts[1].contractId).toBe('0.0.2002');
    expect(output.contracts[1].name).toBe('ContractTwo');
    expect(output.contracts[1].contractEvmAddress).toBe(
      '0x2222222222222222222222222222222222222222',
    );
    expect(output.contracts[1].adminKeyPresent).toBe(false);
    expect(output.contracts[1].network).toBe(NETWORK_MAINNET);
  });

  test('throws when listing contracts fails', async () => {
    const logger = makeLogger();

    const contractState = makeContractStateServiceMock({
      listContracts: jest.fn().mockImplementation(() => {
        throw new InternalError('database error');
      }),
    });

    const api = {
      alias: makeAliasMock(),
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      logger: makeLogger(),
    };
    const args = makeArgs(api, logger, {});

    await expect(
      new ListContractsCommand(contractState).execute(args),
    ).rejects.toThrow('database error');
  });
});
