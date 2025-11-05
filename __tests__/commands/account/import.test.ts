import { Command } from 'commander';
import commands from '../../../src/commands';
import accountUtils from '../../../src/utils/account';
import {
  saveState as storeSaveState,
  get as storeGet,
} from '../../../src/state/store';
import { alice, baseState } from '../../helpers/state';

describe.skip('account import command (legacy - disabled, incompatible with ADR-003)', () => {
  beforeEach(() => {
    storeSaveState(baseState as any);
  });

  describe('account import - success path', () => {
    test('✅ should import account into state', async () => {
      // Arrange
      const importAccountSpy = jest.spyOn(accountUtils, 'importAccount');

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parse([
        'node',
        'hedera-cli.ts',
        'account',
        'import',
        '-n',
        alice.name,
        '-i',
        alice.accountId,
        '-k',
        alice.privateKey,
      ]);

      // Assert
      expect(importAccountSpy).toHaveBeenCalledWith(
        alice.accountId,
        alice.privateKey,
        alice.name,
      );
      expect(storeGet('accounts' as any)).toEqual({ [alice.name]: alice });
    });
  });
});
