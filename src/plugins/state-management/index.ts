/**
 * State Management Plugin Index
 * Exports the state management plugin manifest and command handlers
 */
import { listState } from './commands/list/handler';
import { clearState } from './commands/clear/handler';
import { stateInfo } from './commands/info/handler';
import { stateBackup } from './commands/backup/handler';
import { stateStats } from './commands/stats/handler';

export { stateManagementManifest } from './manifest';

// Export command handlers
export { listState, clearState, stateInfo, stateBackup, stateStats };
