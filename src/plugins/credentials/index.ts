/**
 * Credentials Plugin Index
 * Exports the credentials plugin manifest and command handlers
 */
import { listCredentials } from './commands/list/handler';
import { removeCredentials } from './commands/remove/handler';

export { credentialsManifest } from './manifest';

// Export command handlers
export { listCredentials, removeCredentials };
