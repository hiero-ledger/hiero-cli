import { baseState, fullState } from '../../helpers/state';
import { Command } from 'commander';
import commands from '../../../src/commands';
import accountUtils from '../../../src/utils/account';
import {
  saveState as storeSaveState,
  saveKey as storeSaveKey,
  get as storeGet,
} from '../../../src/state/store';

describe.skip('account list command (legacy - disabled, incompatible with ADR-003)', () => {
  beforeEach(() => {
    storeSaveState(baseState as any);
  });

  describe('account list - success path', () => {
    test('✅ should list all accounts from state', async () => {
      // Arrange
      const listAccountSpy = jest.spyOn(accountUtils, 'listAccounts');
      storeSaveKey('accounts' as any, fullState.accounts as any);

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parse(['node', 'hedera-cli.ts', 'account', 'list']);

      // Assert
      expect(listAccountSpy).toHaveBeenCalledWith(undefined);
      expect(storeGet('accounts' as any)).toEqual(fullState.accounts);
    });

    test('✅ should list all accounts from state with private keys', async () => {
      // Arrange
      const listAccountSpy = jest.spyOn(accountUtils, 'listAccounts');
      storeSaveKey('accounts' as any, fullState.accounts as any);

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parse(['node', 'hedera-cli.ts', 'account', 'list', '-p']);

      // Assert
      expect(listAccountSpy).toHaveBeenCalledWith(true);
      expect(storeGet('accounts' as any)).toEqual(fullState.accounts);
    });
  });
});
