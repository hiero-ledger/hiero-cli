import { PluginStateEntry } from '../../plugins/plugin.interface';
import { StateService } from '../state/state-service.interface';
import { PLUGIN_MANAGEMENT_NAMESPACE } from '../../shared/constants';
import {
  PluginManagementDisableResult,
  PluginManagementDisableStatus,
  PluginManagementEnableResult,
  PluginManagementEnableStatus,
  PluginManagementService,
  PluginManagementCreateResult,
  PluginManagementCreateStatus,
  PluginManagementRemoveResult,
  PluginManagementRemoveStatus,
} from './plugin-management-service.interface';

export class PluginManagementServiceImpl implements PluginManagementService {
  private readonly state: StateService;

  constructor(state: StateService) {
    this.state = state;
  }

  listPlugins(): PluginStateEntry[] {
    return this.state.list<PluginStateEntry>(PLUGIN_MANAGEMENT_NAMESPACE);
  }

  getPlugin(name: string): PluginStateEntry | undefined {
    const entry = this.state.get<PluginStateEntry>(
      PLUGIN_MANAGEMENT_NAMESPACE,
      name,
    );
    return entry ?? undefined;
  }

  addPlugin(entry: PluginStateEntry): PluginManagementCreateResult {
    const existing = this.getPlugin(entry.name);

    if (existing) {
      return {
        status: PluginManagementCreateStatus.Duplicate,
        entry: existing,
      };
    }

    this.savePluginState(entry);

    return { status: PluginManagementCreateStatus.Created, entry };
  }

  removePlugin(name: string): PluginManagementRemoveResult {
    if (name === 'plugin-management') {
      return { status: PluginManagementRemoveStatus.Protected };
    }

    const existing = this.getPlugin(name);

    if (!existing) {
      return { status: PluginManagementRemoveStatus.NotFound };
    }

    this.state.delete(PLUGIN_MANAGEMENT_NAMESPACE, name);

    return { status: PluginManagementRemoveStatus.Removed, entry: existing };
  }

  enablePlugin(name: string): PluginManagementEnableResult {
    const entry = this.getPlugin(name);

    if (!entry) {
      return { status: PluginManagementEnableStatus.NotFound };
    }

    if (entry.enabled) {
      return { status: PluginManagementEnableStatus.AlreadyEnabled, entry };
    }

    const updated: PluginStateEntry = {
      ...entry,
      enabled: true,
    };

    this.savePluginState(updated);

    return { status: PluginManagementEnableStatus.Enabled, entry: updated };
  }

  disablePlugin(name: string): PluginManagementDisableResult {
    if (name === 'plugin-management') {
      return { status: PluginManagementDisableStatus.Protected };
    }

    const entry = this.getPlugin(name);

    if (!entry) {
      return { status: PluginManagementDisableStatus.NotFound };
    }

    if (!entry.enabled) {
      return { status: PluginManagementDisableStatus.AlreadyDisabled, entry };
    }

    const updated: PluginStateEntry = {
      ...entry,
      enabled: false,
    };

    this.savePluginState(updated);

    return { status: PluginManagementDisableStatus.Disabled, entry: updated };
  }

  savePluginState(entry: PluginStateEntry): void {
    this.state.set<PluginStateEntry>(
      PLUGIN_MANAGEMENT_NAMESPACE,
      entry.name,
      entry,
    );
  }
}
