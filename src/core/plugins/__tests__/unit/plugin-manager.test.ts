import { PluginManager } from '../../plugin-manager';
import type { CoreApi } from '../../../core-api/core-api.interface';
import type { PluginManifest } from '../../plugin.interface';
import type { PluginStateSchema } from '../../plugin.types';
import type { Logger } from '../../../services/logger/logger-service.interface';
import type { PluginManagementService } from '../../../services/plugin-management/plugin-management-service.interface';
import {
  makeCoreApiMock,
  makePluginManifest,
  makePluginStateEntry,
  PLUGIN_PATH_BAR,
  PLUGIN_PATH_FOO,
  NAMESPACE_FOO,
  NAMESPACE_BAR,
  PLUGIN_DESCRIPTION_FOO,
  PLUGIN_DESCRIPTION_BAR,
  PLUGIN_NAME_FOO,
  PLUGIN_NAME_BAR,
} from './mocks';

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let coreApiMock: jest.Mocked<CoreApi>;
  let loggerMock: jest.Mocked<Logger>;
  let pluginManagementMock: jest.Mocked<PluginManagementService>;

  beforeEach(() => {
    jest.clearAllMocks();
    coreApiMock = makeCoreApiMock();
    loggerMock = coreApiMock.logger as jest.Mocked<Logger>;
    pluginManagementMock =
      coreApiMock.pluginManagement as jest.Mocked<PluginManagementService>;
    pluginManager = new PluginManager(coreApiMock);
  });

  describe('setDefaultPlugins', () => {
    it('should set default plugin paths', () => {
      const pluginPaths = [PLUGIN_PATH_FOO, PLUGIN_PATH_BAR];

      pluginManager.setDefaultPlugins(pluginPaths);

      expect(pluginManager.listPlugins()).toEqual([]);
    });
  });

  describe('listPlugins', () => {
    it('should return empty array when no plugins are loaded', () => {
      const result = pluginManager.listPlugins();

      expect(result).toEqual([]);
    });

    it('should return list of loaded plugins', () => {
      const manifest = makePluginManifest();
      (pluginManager as any).loadedPlugins.set(PLUGIN_NAME_FOO, {
        manifest,
        path: PLUGIN_PATH_FOO,
        status: 'loaded',
      });

      const result = pluginManager.listPlugins();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: PLUGIN_NAME_FOO,
        path: PLUGIN_PATH_FOO,
        status: 'loaded',
      });
    });
  });

  describe('removePlugin', () => {
    it('should remove plugin from loaded plugins', () => {
      const manifest = makePluginManifest();
      (pluginManager as any).loadedPlugins.set(PLUGIN_NAME_FOO, {
        manifest,
        path: PLUGIN_PATH_FOO,
        status: 'loaded',
      });

      pluginManager.removePlugin(PLUGIN_NAME_FOO);

      expect(pluginManager.listPlugins()).toEqual([]);
      expect(loggerMock.info).toHaveBeenCalledWith(
        `➖ Removing plugin: ${PLUGIN_NAME_FOO}`,
      );
      expect(loggerMock.info).toHaveBeenCalledWith(
        `✅ Plugin removed: ${PLUGIN_NAME_FOO}`,
      );
    });
  });

  describe('getAllNamespaces', () => {
    it('should return empty array when no plugins are loaded', () => {
      const result = pluginManager.getAllNamespaces();

      expect(result).toEqual([]);
    });

    it('should return namespaces from loaded plugins with stateSchemas', () => {
      const stateSchema1: PluginStateSchema = {
        namespace: NAMESPACE_FOO,
        version: 1,
        jsonSchema: {},
        scope: 'plugin',
      };
      const stateSchema2: PluginStateSchema = {
        namespace: NAMESPACE_BAR,
        version: 1,
        jsonSchema: {},
        scope: 'plugin',
      };
      const manifest1 = makePluginManifest({
        name: PLUGIN_NAME_FOO,
        stateSchemas: [stateSchema1],
      });
      const manifest2 = makePluginManifest({
        name: PLUGIN_NAME_BAR,
        stateSchemas: [stateSchema2],
      });

      (pluginManager as any).loadedPlugins.set(PLUGIN_NAME_FOO, {
        manifest: manifest1,
        path: PLUGIN_PATH_FOO,
        status: 'loaded',
      });
      (pluginManager as any).loadedPlugins.set(PLUGIN_NAME_BAR, {
        manifest: manifest2,
        path: PLUGIN_PATH_BAR,
        status: 'loaded',
      });

      const result = pluginManager.getAllNamespaces();

      expect(result).toContain(NAMESPACE_FOO);
      expect(result).toContain(NAMESPACE_BAR);
    });

    it('should not include namespaces from plugins with error status', () => {
      const stateSchema: PluginStateSchema = {
        namespace: NAMESPACE_FOO,
        version: 1,
        jsonSchema: {},
        scope: 'plugin',
      };
      const manifest = makePluginManifest({
        stateSchemas: [stateSchema],
      });

      (pluginManager as any).loadedPlugins.set(PLUGIN_NAME_FOO, {
        manifest,
        path: PLUGIN_PATH_FOO,
        status: 'error',
      });

      const result = pluginManager.getAllNamespaces();

      expect(result).not.toContain(NAMESPACE_FOO);
    });

    it('should not include namespaces from plugins without stateSchemas', () => {
      const manifest = makePluginManifest();

      (pluginManager as any).loadedPlugins.set(PLUGIN_NAME_FOO, {
        manifest,
        path: PLUGIN_PATH_FOO,
        status: 'loaded',
      });

      const result = pluginManager.getAllNamespaces();

      expect(result).toEqual([]);
    });
  });

  describe('initializePluginState', () => {
    it('should initialize state when no plugins exist', () => {
      const defaultState: PluginManifest[] = [
        makePluginManifest({
          name: PLUGIN_NAME_FOO,
          description: PLUGIN_DESCRIPTION_FOO,
        }),
        makePluginManifest({
          name: PLUGIN_NAME_BAR,
          description: PLUGIN_DESCRIPTION_BAR,
        }),
      ];
      pluginManagementMock.listPlugins.mockReturnValue([]);

      const result = pluginManager.initializePluginState(defaultState);

      expect(pluginManagementMock.listPlugins).toHaveBeenCalled();
      expect(pluginManagementMock.savePluginState).toHaveBeenCalledTimes(2);
      expect(pluginManagementMock.savePluginState).toHaveBeenCalledWith({
        name: PLUGIN_NAME_FOO,
        enabled: true,
        description: PLUGIN_DESCRIPTION_FOO,
      });
      expect(pluginManagementMock.savePluginState).toHaveBeenCalledWith({
        name: PLUGIN_NAME_BAR,
        enabled: true,
        description: PLUGIN_DESCRIPTION_BAR,
      });
      expect(loggerMock.info).toHaveBeenCalledWith(
        '[PLUGIN-MANAGEMENT] Initializing default plugin state (first run)...',
      );
      expect(result).toHaveLength(2);
    });

    it('should return existing entries when plugins already exist', () => {
      const defaultState: PluginManifest[] = [
        makePluginManifest({ name: PLUGIN_NAME_FOO }),
      ];
      const existingEntry = makePluginStateEntry();
      pluginManagementMock.listPlugins.mockReturnValue([existingEntry]);

      const result = pluginManager.initializePluginState(defaultState);

      expect(pluginManagementMock.savePluginState).not.toHaveBeenCalled();
      expect(result).toEqual([existingEntry]);
    });
  });

  describe('setupDefaultPlugins', () => {
    it('should setup enabled plugins as default', () => {
      const defaultState: PluginManifest[] = [
        makePluginManifest({ name: PLUGIN_NAME_FOO }),
        makePluginManifest({ name: PLUGIN_NAME_BAR }),
      ];
      const enabledEntry = makePluginStateEntry({ name: PLUGIN_NAME_FOO });
      const disabledEntry = makePluginStateEntry({
        name: PLUGIN_NAME_BAR,
        enabled: false,
      });
      pluginManagementMock.listPlugins.mockReturnValue([
        enabledEntry,
        disabledEntry,
      ]);

      const result = pluginManager.setupDefaultPlugins(defaultState);

      expect(result).toHaveLength(2);
      expect(pluginManager.listPlugins()).toEqual([]);
    });

    it('should filter out disabled plugins from default plugins', () => {
      const defaultState: PluginManifest[] = [
        makePluginManifest({ name: PLUGIN_NAME_FOO }),
        makePluginManifest({ name: PLUGIN_NAME_BAR }),
      ];
      const enabledEntry = makePluginStateEntry({ name: PLUGIN_NAME_FOO });
      const disabledEntry = makePluginStateEntry({
        name: PLUGIN_NAME_BAR,
        enabled: false,
      });
      pluginManagementMock.listPlugins.mockReturnValue([
        enabledEntry,
        disabledEntry,
      ]);

      pluginManager.setupDefaultPlugins(defaultState);

      expect(pluginManager.listPlugins()).toEqual([]);
    });
  });
});
