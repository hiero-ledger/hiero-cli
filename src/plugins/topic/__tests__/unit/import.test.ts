import type { CoreApi } from '@/core';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { ImportTopicOutput } from '@/plugins/topic/commands/import';

import {
  makeAliasMock,
  makeArgs,
  makeLogger,
  makeMirrorMock,
  makeNetworkMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { createMockTopicInfo } from '@/core/services/mirrornode/__tests__/unit/mocks';
import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { importTopic } from '@/plugins/topic/commands/import/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

describe('topic plugin - import command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('imports topic successfully with name', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      findTopicByTopicId: jest.fn().mockReturnValue(null),
      saveTopic: saveTopicMock,
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: '0.0.123456',
      memo: 'Imported topic memo',
      created_timestamp: '1704067200.000000000',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock as CoreApi['network'],
      alias,
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.123456',
      name: 'my-topic',
    });

    const result = await importTopic(args);

    expect(mirrorMock.getTopicInfo).toHaveBeenCalledWith('0.0.123456');
    expect(alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'my-topic',
        type: 'topic',
        network: SupportedNetwork.TESTNET,
        entityId: '0.0.123456',
      }),
    );
    expect(saveTopicMock).toHaveBeenCalledWith(
      '0.0.123456',
      expect.objectContaining({
        name: 'my-topic',
        topicId: '0.0.123456',
        memo: 'Imported topic memo',
        network: SupportedNetwork.TESTNET,
      }),
    );

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ImportTopicOutput = JSON.parse(result.outputJson!);
    expect(output.topicId).toBe('0.0.123456');
    expect(output.name).toBe('my-topic');
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.memo).toBe('Imported topic memo');
    expect(output.alias).toBe('my-topic');
  });

  test('imports topic successfully without name', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      findTopicByTopicId: jest.fn().mockReturnValue(null),
      saveTopic: saveTopicMock,
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: '0.0.999999',
      created_timestamp: '1704067200.000000000',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock as CoreApi['network'],
      alias,
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.999999',
    });

    const result = await importTopic(args);

    expect(mirrorMock.getTopicInfo).toHaveBeenCalledWith('0.0.999999');
    expect(alias.register).not.toHaveBeenCalled();
    expect(saveTopicMock).toHaveBeenCalledWith(
      '0.0.999999',
      expect.objectContaining({
        name: 'imported-0-0-999999',
        topicId: '0.0.999999',
        network: SupportedNetwork.TESTNET,
      }),
    );

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ImportTopicOutput = JSON.parse(result.outputJson!);
    expect(output.topicId).toBe('0.0.999999');
    expect(output.name).toBe('imported-0-0-999999');
    expect(output.alias).toBeUndefined();
  });

  test('returns failure when topic already exists in state', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      findTopicByTopicId: jest.fn().mockReturnValue({
        topicId: '0.0.123456',
        name: 'existing',
      }),
      saveTopic: jest.fn(),
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: '0.0.123456',
      created_timestamp: '1704067200.000000000',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET) as CoreApi['network'],
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.123456',
      name: 'new-topic',
    });

    const result = await importTopic(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      "Topic with ID '0.0.123456' already exists in state",
    );
  });

  test('returns failure when mirror.getTopicInfo throws', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      findTopicByTopicId: jest.fn().mockReturnValue(null),
      saveTopic: jest.fn(),
    }));

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest
      .fn()
      .mockRejectedValue(new Error('Topic not found'));

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET) as CoreApi['network'],
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.123456',
    });

    const result = await importTopic(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Topic not found');
  });
});
