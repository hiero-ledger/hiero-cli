/**
 * Unit tests for PluginManagementServiceImpl
 * Tests plugin listing, CRUD, enable/disable and state persistence
 */
import { makeStateMock } from '@/__tests__/mocks/mocks';
import type { PluginStateEntry } from '@/core/plugins/plugin.interface';
import { PluginManagementServiceImpl } from '@/core/services/plugin-management/plugin-management-service';
import {
  PluginManagementCreateStatus,
  PluginManagementDisableStatus,
  PluginManagementEnableStatus,
  PluginManagementRemoveStatus,
} from '@/core/services/plugin-management/plugin-management-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import { PLUGIN_MANAGEMENT_NAMESPACE } from '@/core/shared/constants';

const PLUGIN_NAME_FOO = 'foo-plugin';
const PLUGIN_NAME_BAR = 'bar-plugin';
const PLUGIN_NAME_MANAGEMENT = 'plugin-management';

const makePluginEntry = (
  overrides: Partial<PluginStateEntry> = {},
): PluginStateEntry => ({
  name: PLUGIN_NAME_FOO,
  path: 'dist/plugins/foo-plugin',
  enabled: false,
  ...overrides,
});

describe('PluginManagementServiceImpl', () => {
  let stateMock: jest.Mocked<StateService>;
  let service: PluginManagementServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    stateMock = makeStateMock() as jest.Mocked<StateService>;
    service = new PluginManagementServiceImpl(stateMock);
  });

  describe('listPlugins', () => {
    it('should return list of plugins from state', () => {
      const entries = [
        makePluginEntry(),
        makePluginEntry({
          name: PLUGIN_NAME_BAR,
          path: 'dist/plugins/bar-plugin',
        }),
      ];
      stateMock.list.mockReturnValue(entries);

      const result = service.listPlugins();

      expect(stateMock.list).toHaveBeenCalledWith(PLUGIN_MANAGEMENT_NAMESPACE);
      expect(result).toEqual(entries);
    });

    it('should return empty list when state has no plugins', () => {
      stateMock.list.mockReturnValue([]);

      const result = service.listPlugins();

      expect(result).toEqual([]);
    });
  });

  describe('getPlugin', () => {
    it('should return plugin when it exists', () => {
      const entry = makePluginEntry();
      stateMock.get.mockReturnValue(entry);

      const result = service.getPlugin(PLUGIN_NAME_FOO);

      expect(stateMock.get).toHaveBeenCalledWith(
        PLUGIN_MANAGEMENT_NAMESPACE,
        PLUGIN_NAME_FOO,
      );
      expect(result).toBe(entry);
    });

    it('should return undefined when plugin does not exist', () => {
      stateMock.get.mockReturnValue(undefined);

      const result = service.getPlugin(PLUGIN_NAME_FOO);

      expect(result).toBeUndefined();
    });

    it('should return undefined when state returns null', () => {
      stateMock.get.mockReturnValue(null);

      const result = service.getPlugin(PLUGIN_NAME_FOO);

      expect(result).toBeUndefined();
    });
  });

  describe('addPlugin', () => {
    it('should create plugin when it does not exist', () => {
      const entry = makePluginEntry();
      jest.spyOn(service, 'getPlugin').mockReturnValue(undefined);
      const saveSpy = jest.spyOn(service, 'savePluginState');

      const result = service.addPlugin(entry);

      expect(service.getPlugin).toHaveBeenCalledWith(entry.name);
      expect(saveSpy).toHaveBeenCalledWith(entry);
      expect(result).toEqual({
        status: PluginManagementCreateStatus.Created,
        entry,
      });
    });

    it('should return duplicate status when plugin already exists', () => {
      const existing = makePluginEntry({ enabled: true });
      jest.spyOn(service, 'getPlugin').mockReturnValue(existing);
      const saveSpy = jest.spyOn(service, 'savePluginState');

      const entry = makePluginEntry();
      const result = service.addPlugin(entry);

      expect(service.getPlugin).toHaveBeenCalledWith(entry.name);
      expect(saveSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: PluginManagementCreateStatus.Duplicate,
        entry: existing,
      });
    });
  });

  describe('removePlugin', () => {
    it('should protect plugin-management plugin from removal', () => {
      const result = service.removePlugin(PLUGIN_NAME_MANAGEMENT);

      expect(result).toEqual({
        status: PluginManagementRemoveStatus.Protected,
      });
      expect(stateMock.delete).not.toHaveBeenCalled();
    });

    it('should return not-found when plugin does not exist', () => {
      jest.spyOn(service, 'getPlugin').mockReturnValue(undefined);

      const result = service.removePlugin(PLUGIN_NAME_FOO);

      expect(service.getPlugin).toHaveBeenCalledWith(PLUGIN_NAME_FOO);
      expect(result).toEqual({
        status: PluginManagementRemoveStatus.NotFound,
      });
      expect(stateMock.delete).not.toHaveBeenCalled();
    });

    it('should remove plugin when it exists', () => {
      const existing = makePluginEntry();
      jest.spyOn(service, 'getPlugin').mockReturnValue(existing);

      const result = service.removePlugin(PLUGIN_NAME_FOO);

      expect(service.getPlugin).toHaveBeenCalledWith(PLUGIN_NAME_FOO);
      expect(stateMock.delete).toHaveBeenCalledWith(
        PLUGIN_MANAGEMENT_NAMESPACE,
        PLUGIN_NAME_FOO,
      );
      expect(result).toEqual({
        status: PluginManagementRemoveStatus.Removed,
        entry: existing,
      });
    });
  });

  describe('enablePlugin', () => {
    it('should return not-found when plugin does not exist', () => {
      jest.spyOn(service, 'getPlugin').mockReturnValue(undefined);

      const result = service.enablePlugin(PLUGIN_NAME_FOO);

      expect(service.getPlugin).toHaveBeenCalledWith(PLUGIN_NAME_FOO);
      expect(result).toEqual({
        status: PluginManagementEnableStatus.NotFound,
      });
    });

    it('should return already-enabled when plugin is already enabled', () => {
      const entry = makePluginEntry({ enabled: true });
      jest.spyOn(service, 'getPlugin').mockReturnValue(entry);
      const saveSpy = jest.spyOn(service, 'savePluginState');

      const result = service.enablePlugin(PLUGIN_NAME_FOO);

      expect(service.getPlugin).toHaveBeenCalledWith(PLUGIN_NAME_FOO);
      expect(saveSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: PluginManagementEnableStatus.AlreadyEnabled,
        entry,
      });
    });

    it('should enable plugin when it is disabled', () => {
      const entry = makePluginEntry({ enabled: false });
      jest.spyOn(service, 'getPlugin').mockReturnValue(entry);
      const saveSpy = jest.spyOn(service, 'savePluginState');

      const result = service.enablePlugin(PLUGIN_NAME_FOO);

      expect(service.getPlugin).toHaveBeenCalledWith(PLUGIN_NAME_FOO);
      expect(saveSpy).toHaveBeenCalledWith({
        ...entry,
        enabled: true,
      });
      expect(result).toEqual({
        status: PluginManagementEnableStatus.Enabled,
        entry: {
          ...entry,
          enabled: true,
        },
      });
    });
  });

  describe('disablePlugin', () => {
    it('should protect plugin-management plugin from being disabled', () => {
      const result = service.disablePlugin(PLUGIN_NAME_MANAGEMENT);

      expect(result).toEqual({
        status: PluginManagementDisableStatus.Protected,
      });
    });

    it('should return not-found when plugin does not exist', () => {
      jest.spyOn(service, 'getPlugin').mockReturnValue(undefined);

      const result = service.disablePlugin(PLUGIN_NAME_FOO);

      expect(service.getPlugin).toHaveBeenCalledWith(PLUGIN_NAME_FOO);
      expect(result).toEqual({
        status: PluginManagementDisableStatus.NotFound,
      });
    });

    it('should return already-disabled when plugin is already disabled', () => {
      const entry = makePluginEntry({ enabled: false });
      jest.spyOn(service, 'getPlugin').mockReturnValue(entry);
      const saveSpy = jest.spyOn(service, 'savePluginState');

      const result = service.disablePlugin(PLUGIN_NAME_FOO);

      expect(service.getPlugin).toHaveBeenCalledWith(PLUGIN_NAME_FOO);
      expect(saveSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: PluginManagementDisableStatus.AlreadyDisabled,
        entry,
      });
    });

    it('should disable plugin when it is enabled', () => {
      const entry = makePluginEntry({ enabled: true });
      jest.spyOn(service, 'getPlugin').mockReturnValue(entry);
      const saveSpy = jest.spyOn(service, 'savePluginState');

      const result = service.disablePlugin(PLUGIN_NAME_FOO);

      expect(service.getPlugin).toHaveBeenCalledWith(PLUGIN_NAME_FOO);
      expect(saveSpy).toHaveBeenCalledWith({
        ...entry,
        enabled: false,
      });
      expect(result).toEqual({
        status: PluginManagementDisableStatus.Disabled,
        entry: {
          ...entry,
          enabled: false,
        },
      });
    });
  });

  describe('savePluginState', () => {
    it('should save plugin state to StateService', () => {
      const entry = makePluginEntry();

      service.savePluginState(entry);

      expect(stateMock.set).toHaveBeenCalledWith(
        PLUGIN_MANAGEMENT_NAMESPACE,
        entry.name,
        entry,
      );
    });
  });
});
