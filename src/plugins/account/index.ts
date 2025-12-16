/**
 * Account Plugin Index
 * Exports the account plugin manifest and command handlers
 */
import { getAccountBalance } from './commands/balance/handler';
import { clearAccounts } from './commands/clear/handler';
import { createAccount } from './commands/create/handler';
import { deleteAccount } from './commands/delete/handler';
import { importAccount } from './commands/import/handler';
import { listAccounts } from './commands/list/handler';
import { viewAccount } from './commands/view/handler';

export { accountPluginManifest } from './manifest';

// Export command handlers
export {
  clearAccounts,
  createAccount,
  deleteAccount,
  getAccountBalance,
  importAccount,
  listAccounts,
  viewAccount,
};
