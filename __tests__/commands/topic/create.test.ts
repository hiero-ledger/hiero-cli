import { Command } from 'commander';
import commands from '../../../src/commands';
import {
  get as storeGet,
  saveState as storeSaveState,
} from '../../../src/state/store';
import { baseState, topic } from '../../helpers/state';

jest.mock('@hashgraph/sdk', () => {
  const originalModule = jest.requireActual('@hashgraph/sdk');

  return {
    ...originalModule,
    TopicCreateTransaction: jest.fn().mockImplementation(() => ({
      setTopicMemo: jest.fn().mockReturnThis(),
      setAdminKey: jest.fn().mockReturnThis(),
      setSubmitKey: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        getReceipt: jest.fn().mockResolvedValue({
          topicId: topic.topicId,
        }),
      }),
    })),
  };
});

describe.skip('topic create command (legacy - disabled, incompatible with ADR-003)', () => {
  const logSpy = jest.spyOn(console, 'log');

  beforeEach(() => {
    storeSaveState(baseState as any);
  });

  describe('topic create - success path', () => {
    afterEach(() => {
      // Spy cleanup
      logSpy.mockClear();
    });

    test('✅ Create a new topic', async () => {
      // Arrange
      const program = new Command();
      commands.topicCommands(program);
      const customTopic = {
        ...topic,
        memo: 'my custom memo',
      };

      // Act
      await program.parseAsync([
        'node',
        'hedera-cli.ts',
        'topic',
        'create',
        '--memo',
        customTopic.memo,
      ]);

      // Assert
      const topics = storeGet('topics' as any);
      expect(Object.keys(topics).length).toEqual(1);
      expect(topics[topic.topicId]).toEqual(customTopic);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Topic created'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('ID:'));
    });
  });
});
