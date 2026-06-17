import type { CoreApi } from '@/core/core-api/core-api.interface';

import { makeArgs, makeLogger, makeNetworkMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  scheduleList,
  ScheduleListOutputSchema,
} from '@/plugins/schedule/commands/list';
import { ScheduleStateServiceImpl } from '@/plugins/schedule/services/schedule-state.service';

import { SCHEDULE_NAME } from './helpers/fixtures';

jest.mock('../../services/schedule-state.service', () => ({
  ScheduleStateServiceImpl: jest.fn(),
}));

const MockedScheduleState = ScheduleStateServiceImpl as jest.Mock;

describe('schedule plugin — list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns schedules list', async () => {
    const logger = makeLogger();
    MockedScheduleState.mockImplementation(() => ({
      listScheduled: jest.fn().mockReturnValue([
        {
          name: SCHEDULE_NAME,
          network: SupportedNetwork.TESTNET,
          scheduled: false,
          executed: false,
          waitForExpiry: false,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        {
          name: 'mainnet-schedule',
          network: SupportedNetwork.MAINNET,
          scheduled: true,
          executed: false,
          waitForExpiry: true,
          createdAt: '2025-01-02T00:00:00.000Z',
        },
      ]),
    }));

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs({ ...api, logger }, {});

    const result = await scheduleList(args);

    const output = assertOutput(result.result, ScheduleListOutputSchema);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.total).toBe(2);
    expect(output.schedules).toHaveLength(2);
    expect(output.schedules[0].name).toBe(SCHEDULE_NAME);
    expect(output.schedules[0].network).toBe(SupportedNetwork.TESTNET);
  });

  test('returns empty list when no schedules exist for the current network', async () => {
    const logger = makeLogger();
    MockedScheduleState.mockImplementation(() => ({
      listScheduled: jest.fn().mockReturnValue([]),
    }));

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs({ ...api, logger }, {});

    const result = await scheduleList(args);

    const output = assertOutput(result.result, ScheduleListOutputSchema);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.total).toBe(0);
    expect(output.schedules).toHaveLength(0);
  });
});
