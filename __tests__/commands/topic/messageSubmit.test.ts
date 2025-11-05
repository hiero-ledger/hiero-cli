import { TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import { Command } from 'commander';
import commands from '../../../src/commands';
import { saveState as storeSaveState } from '../../../src/state/store';
import sdkMock from '../../helpers/sdk';
import { topic, topicState } from '../../helpers/state';

// Mock the @hashgraph/sdk module directly in the test file
jest.mock('@hashgraph/sdk', () => {
  const originalModule = jest.requireActual('@hashgraph/sdk');

  return {
    ...originalModule,
    TopicMessageSubmitTransaction: jest
      .fn()
      .mockImplementation(() => sdkMock.mockTopicMessageSubmitTransaction()),
  };
});

describe.skip('topic message submit command (legacy - disabled, incompatible with ADR-003)', () => {
  const logSpy = jest.spyOn(console, 'log');

  beforeEach(() => {
    storeSaveState(topicState as any);
    sdkMock.setCustomMockImplementation(null);
  });

  describe('topic message submit - success path', () => {
    afterEach(() => {
      // Spy cleanup
      logSpy.mockClear();
    });

    test('✅ Submit message to topic ID', async () => {
      // Arrange
      const program = new Command();
      commands.topicCommands(program);
      const message = 'Hello world!';

      // Overwrite the mock implementation of TopicCreateTransaction to return a sequence number of 1
      const sequenceNumber = 2;
      sdkMock.setCustomMockImplementation(
        () =>
          ({
            freezeWith: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({
              getReceipt: jest.fn().mockResolvedValue({
                topicSequenceNumber: sequenceNumber,
              }),
            }),
          }) as unknown as TopicMessageSubmitTransaction,
      );

      // Act
      await program.parseAsync([
        'node',
        'hedera-cli.ts',
        'topic',
        'message',
        'submit',
        '--message',
        message,
        '-t',
        topic.topicId,
      ]);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Message submitted:'),
      );
    });
  });
});
