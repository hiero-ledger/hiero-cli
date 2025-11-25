// Import plugin types
export * from './plugin.types';

export interface CommandHandlerArgs {
  args: Record<string, unknown>;
  api: CoreApi; // injected instance per execution
  state: StateManager; // namespaced access provided by Core
  config: ConfigView;
  logger: Logger;
}

// Import types from other interfaces
import { CoreApi } from '../core-api/core-api.interface';
import { StateService } from '../services/state/state-service.interface';
import { ConfigService } from '../services/config/config-service.interface';
import { Logger } from '../services/logger/logger-service.interface';

// Type aliases for ADR-001 compliance
export type StateManager = StateService;
export type ConfigView = ConfigService;

export interface PluginStateEntry {
  name: string;
  enabled: boolean;
  path?: string;
  description?: string;
}
