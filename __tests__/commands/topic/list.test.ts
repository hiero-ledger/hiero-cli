import { Command } from 'commander';
import commands from '../../../src/commands';
import { saveState as storeSaveState } from '../../../src/state/store';
import { topicState } from '../../helpers/state';

describe.skip('topic list command (legacy - disabled, incompatible with ADR-003)', () => {
  const logSpy = jest.spyOn(console, 'log');

  beforeEach(() => {
    storeSaveState(topicState as any);
  });

  describe('topic message submit - success path', () => {
    afterEach(() => {
      // Spy cleanup
      logSpy.mockClear();
    });

    test('✅ List all topics', async () => {
      // Arrange
      const program = new Command();
      commands.topicCommands(program);

      // Act
      await program.parseAsync(['node', 'hedera-cli.ts', 'topic', 'list']);

      // Assert
      // Just check presence of key list markers to stay resilient to color formatting
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topics'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic ID'));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Submit key'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Admin key'));
    });
  });
});
