import { baseState, bob } from '../../helpers/state';
import { Command } from 'commander';
import commands from '../../../src/commands';
import accountUtils from '../../../src/utils/account';
import {
  saveState as storeSaveState,
  saveKey as storeSaveKey,
  get as storeGet,
} from '../../../src/state/store';

describe.skip('account delete command (legacy - disabled, incompatible with ADR-003)', () => {
  beforeEach(() => {
    storeSaveState(baseState as any);
  });

  describe('account delete - success path', () => {
    test('✅ should delete account by account ID', async () => {
      // Arrange
      const deleteAccountSpy = jest.spyOn(accountUtils, 'deleteAccount');
      storeSaveKey('accounts' as any, { [bob.name]: bob } as any);

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parse([
        'node',
        'hedera-cli.ts',
        'account',
        'delete',
        '-i',
        bob.accountId,
      ]);

      // Assert
      expect(deleteAccountSpy).toHaveBeenCalledWith(bob.accountId);
      expect(storeGet('accounts' as any)).toEqual({});
    });

    test('✅ should delete account by name', async () => {
      // Arrange
      const deleteAccountSpy = jest.spyOn(accountUtils, 'deleteAccount');
      storeSaveKey('accounts' as any, { [bob.name]: bob } as any);

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parse([
        'node',
        'hedera-cli.ts',
        'account',
        'delete',
        '-n',
        bob.name,
      ]);

      // Assert
      expect(deleteAccountSpy).toHaveBeenCalledWith(bob.name);
      expect(storeGet('accounts' as any)).toEqual({});
    });
  });
});
