import { Command } from 'commander';
import commands from '../../../src/commands';
import {
  getState as storeGetAll,
  saveState as storeSaveState,
} from '../../../src/state/store';
import stateUtils from '../../../src/utils/state';
import {
  accountState,
  baseState,
  downloadState,
  fullState,
  script_basic,
} from '../../helpers/state';

describe.skip('state download command (legacy - disabled, incompatible with ADR-003)', () => {
  const stateUtilsDownloadStateSpy = jest
    .spyOn(stateUtils, 'downloadState')
    .mockResolvedValue(downloadState);

  const consoleErrorSpy = jest.spyOn(console, 'error');

  const mockProcessExit = jest
    .spyOn(process, 'exit')
    .mockImplementation((code) => {
      throw new Error(`Process.exit(${code})`); // Forces the code to throw instead of exit
    });

  describe('state download - success path', () => {
    beforeAll(() => {
      storeSaveState(baseState as any);
    });

    afterEach(() => {
      // Spy cleanup
      stateUtilsDownloadStateSpy.mockClear();
      consoleErrorSpy.mockClear();
      mockProcessExit.mockClear();
    });

    test('✅ download state and merge with base state', async () => {
      // Arrange
      storeSaveState(baseState as any);
      const program = new Command();
      commands.stateCommands(program);
      const url = 'https://dummy.url/state.json';

      // Act
      await program.parseAsync([
        'node',
        'hedera-cli.ts',
        'state',
        'download',
        '--url',
        url,
        '--merge',
      ]);

      // Assert
      expect(stateUtilsDownloadStateSpy).toHaveBeenCalledWith(url);
      const {
        actions: _actionsMerge,
        scriptExecutionName: _scriptExecMerge,
        ...stateAfterMerge
      } = storeGetAll() as any;
      expect(stateAfterMerge).toEqual({
        ...fullState,
        scripts: {
          'script-basic': {
            ...script_basic,
            creation: expect.any(Number),
          },
        },
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('✅ download and overwrite state', async () => {
      // Arrange
      storeSaveState(accountState as any);
      const program = new Command();
      commands.stateCommands(program);
      const url = 'https://dummy.url/state.json';

      // Act
      await program.parseAsync([
        'node',
        'hedera-cli.ts',
        'state',
        'download',
        '--url',
        url,
        '--overwrite',
      ]);

      // Assert
      expect(stateUtilsDownloadStateSpy).toHaveBeenCalledWith(url);
      const {
        actions: _actionsOverwrite,
        scriptExecutionName: _scriptExecOverwrite,
        ...stateAfterOverwrite
      } = storeGetAll() as any;
      expect(stateAfterOverwrite).toEqual({
        ...fullState,
        scripts: {
          [`script-${script_basic.name}`]: {
            ...script_basic,
            creation: expect.any(Number),
          },
        },
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // overwrite should be silent on errors
    });
  });
});
