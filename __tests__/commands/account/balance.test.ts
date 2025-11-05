import { Command } from 'commander';
import commands from '../../../src/commands';
import accountUtils from '../../../src/utils/account';
import api from '../../../src/api';

import {
  accountResponse,
  getAccountInfoResponseMock,
} from '../../helpers/api/apiAccountHelper';
import { baseState } from '../../helpers/state';
import { saveState as storeSaveState } from '../../../src/state/store';

describe.skip('account balance command (legacy - disabled, incompatible with ADR-003)', () => {
  const logSpy = jest.spyOn(console, 'log');
  const getAccountBalanceSpy = jest.spyOn(accountUtils, 'getAccountBalance');

  describe('account balance - success path', () => {
    beforeEach(() => {
      storeSaveState(baseState as any);
    });

    afterEach(() => {
      // Spy cleanup
      logSpy.mockClear();
      getAccountBalanceSpy.mockClear();
    });

    test('✅ retrieve hbar balance', async () => {
      // Arrange
      api.account.getAccountInfo = jest
        .fn()
        .mockResolvedValue(getAccountInfoResponseMock);

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parseAsync([
        'node',
        'hedera-cli.ts',
        'account',
        'balance',
        '-a',
        accountResponse.account,
        '--only-hbar',
      ]);

      // Assert
      expect(getAccountBalanceSpy).toHaveBeenCalledWith(
        accountResponse.account,
        true,
        undefined,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Hbar balance for account ${accountResponse.account}:`,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `${accountResponse.balance.balance} Tinybars or ${accountResponse.balance.balance / 100000000} Hbar`,
      );
    });

    test('✅ retrieve token balance', async () => {
      // Arrange
      api.account.getAccountInfo = jest
        .fn()
        .mockResolvedValue(getAccountInfoResponseMock);

      const program = new Command();
      commands.accountCommands(program);

      // Act
      await program.parseAsync([
        'node',
        'hedera-cli.ts',
        'account',
        'balance',
        '-a',
        accountResponse.account,
        '--token-id',
        accountResponse.balance.tokens[0].token_id,
      ]);

      // Assert
      expect(getAccountBalanceSpy).toHaveBeenCalledWith(
        accountResponse.account,
        undefined,
        accountResponse.balance.tokens[0].token_id,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Token ID ${accountResponse.balance.tokens[0].token_id}: ${accountResponse.balance.tokens[0].balance}`,
      );
    });
  });
});
