import { Command } from 'commander';
import commands from '../../../src/commands';
import { saveState as storeSaveState } from '../../../src/state/store';
import { baseState, scriptState, script_basic } from '../../helpers/state';

describe.skip('script list command (legacy - disabled, incompatible with ADR-003)', () => {
  const logSpy = jest.spyOn(console, 'log');

  beforeEach(() => {
    storeSaveState(baseState as any);
  });

  describe('script list - success path', () => {
    afterEach(() => {
      // Spy cleanup
      logSpy.mockClear();
    });

    test('✅ should list all scripts from state', async () => {
      // Arrange
      const program = new Command();
      commands.scriptCommands(program);
      storeSaveState(scriptState as any);

      // Act
      await program.parse(['node', 'hedera-cli.ts', 'script', 'list']);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Scripts'));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(script_basic.name),
      );
      script_basic.commands.forEach((command) => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(command));
      });
    });
  });
});
