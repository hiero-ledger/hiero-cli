import type { PluginStateEntry } from '@/core/plugins/plugin.interface';

export enum PluginManagementCreateStatus {
  Created = 'created',
  Duplicate = 'duplicate',
}

export type PluginManagementCreateResult =
  | { status: PluginManagementCreateStatus.Created; entry: PluginStateEntry }
  | { status: PluginManagementCreateStatus.Duplicate; entry: PluginStateEntry };

export enum PluginManagementRemoveStatus {
  Removed = 'removed',
  NotFound = 'not-found',
  Protected = 'protected',
}

export type PluginManagementRemoveResult =
  | { status: PluginManagementRemoveStatus.Removed; entry: PluginStateEntry }
  | { status: PluginManagementRemoveStatus.NotFound }
  | { status: PluginManagementRemoveStatus.Protected };

export enum PluginManagementEnableStatus {
  Enabled = 'enabled',
  AlreadyEnabled = 'already-enabled',
  NotFound = 'not-found',
}

export type PluginManagementEnableResult =
  | { status: PluginManagementEnableStatus.Enabled; entry: PluginStateEntry }
  | {
      status: PluginManagementEnableStatus.AlreadyEnabled;
      entry: PluginStateEntry;
    }
  | { status: PluginManagementEnableStatus.NotFound };

export enum PluginManagementDisableStatus {
  Disabled = 'disabled',
  AlreadyDisabled = 'already-disabled',
  NotFound = 'not-found',
  Protected = 'protected',
}

export type PluginManagementDisableResult =
  | { status: PluginManagementDisableStatus.Disabled; entry: PluginStateEntry }
  | {
      status: PluginManagementDisableStatus.AlreadyDisabled;
      entry: PluginStateEntry;
    }
  | { status: PluginManagementDisableStatus.NotFound }
  | { status: PluginManagementDisableStatus.Protected };

export interface PluginManagementService {
  listPlugins(): PluginStateEntry[];
  getPlugin(name: string): PluginStateEntry | undefined;
  addPlugin(entry: PluginStateEntry): PluginManagementCreateResult;
  removePlugin(name: string): PluginManagementRemoveResult;
  enablePlugin(name: string): PluginManagementEnableResult;
  disablePlugin(name: string): PluginManagementDisableResult;
  savePluginState(entry: PluginStateEntry): void;
}
