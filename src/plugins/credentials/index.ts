/**
 * Credentials Plugin Index
 * Exports the credentials plugin manifest and command handlers
 */
import { listCredentials } from './commands/list';
import { removeCredentials } from './commands/remove';

export { credentialsManifest } from './manifest';

export { listCredentials, removeCredentials };
