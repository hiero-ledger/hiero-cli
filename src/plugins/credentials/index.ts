/**
 * Credentials Plugin Index
 * Exports the credentials plugin manifest and command handlers
 */
import { credentialsGenerate } from './commands/generate';
import { credentialsImport } from './commands/import';
import { credentialsList } from './commands/list';
import { credentialsRemove } from './commands/remove';

export { credentialsManifest } from './manifest';

export {
  credentialsGenerate,
  credentialsImport,
  credentialsList,
  credentialsRemove,
};
