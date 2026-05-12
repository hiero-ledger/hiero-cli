/**
 * Credentials Plugin Index
 * Exports the credentials plugin manifest and command handlers
 */
import { credentialsList } from './commands/list';
import { credentialsRemove } from './commands/remove';

export { credentialsManifest } from './manifest';

export { credentialsList, credentialsRemove };
