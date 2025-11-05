import { baseState } from '../../helpers/state';
import { Command } from 'commander';
import commands from '../../../src/commands';
import accountUtils from '../../../src/utils/account';
import { saveState as storeSaveState } from '../../../src/state/store';
import { AccountId } from '@hashgraph/sdk';

jest.mock('@hashgraph/sdk', () => {
  const originalModule = jest.requireActual('@hashgraph/sdk');

  return {
    ...originalModule,
    AccountCreateTransaction: jest.fn().mockImplementation(() => ({
      setKey: jest.fn().mockReturnThis(),
      setECDSAKeyWithAlias: jest.fn().mockReturnThis(),
      setInitialBalance: jest.fn().mockReturnThis(),
      setMaxAutomaticTokenAssociations: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        getReceipt: jest.fn().mockResolvedValue({
          accountId: AccountId.fromString('0.0.1234'),
        }),
      }),
    })),
  };
});

describe.skip('account create command (legacy - disabled, incompatible with ADR-003)', () => {
  beforeEach(() => {
    storeSaveState(baseState as any);
  });

  describe('account create - success path', () => {
    test('✅ should create ECDSA account in state', async () => {
      // Arrange
      const balance = 5000;
      const newAccountName = 'greg';
      const createAccountSpy = jest.spyOn(accountUtils, 'createAccount');

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parseAsync([
        'node',
        'hedera-cli.ts',
        'account',
        'create',
        '-n',
        newAccountName,
        '-b',
        balance.toString(),
      ]);

      // Assert
      const greg = accountUtils.findAccountByName(newAccountName);
      expect(createAccountSpy).toHaveBeenCalledWith(
        balance,
        'ECDSA',
        newAccountName,
        0,
      );
      expect(greg.name).toBe(newAccountName);
      expect(greg.type).toBe('ECDSA');
    });

    test('✅ should create ECDSA account in state', async () => {
      // Arrange
      const balance = 5000;
      const newAccountName = 'greg';
      const type = 'ECDSA';
      const createAccountSpy = jest.spyOn(accountUtils, 'createAccount');

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parseAsync([
        'node',
        'hedera-cli.ts',
        'account',
        'create',
        '-n',
        newAccountName,
        '-b',
        balance.toString(),
      ]);

      // Assert
      const greg = accountUtils.findAccountByName(newAccountName);
      expect(createAccountSpy).toHaveBeenCalledWith(
        balance,
        type,
        newAccountName,
        0,
      );
      expect(greg.name).toBe(newAccountName);
      expect(greg.type).toBe(type);
    });
  });
});
