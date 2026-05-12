// Import plugin types
import type { Hook } from '@/core/hooks/hook.interface';
import type { HookPhase } from '@/core/hooks/types';

export type * from './plugin.types';

export interface CommandHandlerArgs {
  args: Record<string, unknown>;
  api: CoreApi; // injected instance per execution
  hooks?: Map<HookPhase, Hook[]>;
}

// Import types from other interfaces
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

// Type aliases for ADR-001 compliance
export type StateManager = StateService;
export type ConfigView = ConfigService;

export interface PluginStateEntry {
  name: string;
  enabled: boolean;
  path?: string;
  description?: string;
}
