import type { CoreApi } from '../../../core-api/core-api.interface';
import type { PluginManifest, PluginStateEntry } from '../../plugin.interface';
import { makeLogger, makeStateMock } from '../../../../__tests__/mocks/mocks';
import type { StateService } from '../../../services/state/state-service.interface';
import type { PluginManagementService } from '../../../services/plugin-management/plugin-management-service.interface';
import type { OutputService } from '../../../services/output/output-service.interface';

export const PLUGIN_NAME_FOO = 'foo-plugin';
export const PLUGIN_NAME_BAR = 'bar-plugin';
export const PLUGIN_PATH_FOO = './dist/plugins/foo-plugin';
export const PLUGIN_PATH_BAR = './dist/plugins/bar-plugin';
export const NAMESPACE_FOO = 'foo-namespace';
export const NAMESPACE_BAR = 'bar-namespace';
export const PLUGIN_DESCRIPTION_FOO = 'Foo plugin description';
export const PLUGIN_DESCRIPTION_BAR = 'Bar plugin description';

export const makeCoreApiMock = (
  overrides: Partial<CoreApi> = {},
): jest.Mocked<CoreApi> => {
  const logger = makeLogger();
  const stateMock = makeStateMock() as jest.Mocked<StateService>;
  const pluginManagementMock = {
    listPlugins: jest.fn().mockReturnValue([]),
    getPlugin: jest.fn(),
    addPlugin: jest.fn(),
    removePlugin: jest.fn(),
    enablePlugin: jest.fn(),
    disablePlugin: jest.fn(),
    savePluginState: jest.fn(),
  } as unknown as jest.Mocked<PluginManagementService>;
  const outputMock = {
    handleCommandOutput: jest.fn(),
    getFormat: jest.fn().mockReturnValue('human'),
    setFormat: jest.fn(),
  } as unknown as jest.Mocked<OutputService>;

  return {
    account: {} as any,
    token: {} as any,
    txExecution: {} as any,
    topic: {} as any,
    state: stateMock,
    mirror: {} as any,
    network: {} as any,
    config: {} as any,
    logger,
    alias: {} as any,
    kms: {} as any,
    hbar: {} as any,
    output: outputMock,
    pluginManagement: pluginManagementMock,
    ...overrides,
  } as jest.Mocked<CoreApi>;
};

export const makePluginManifest = (
  overrides: Partial<PluginManifest> = {},
): PluginManifest => ({
  name: 'foo-plugin',
  version: '1.0.0',
  displayName: 'Foo Plugin',
  description: 'Foo plugin description',
  compatibility: {
    cli: '1.0.0',
    core: '1.0.0',
    api: '1.0.0',
  },
  capabilities: [],
  commands: [],
  ...overrides,
});

export const makePluginStateEntry = (
  overrides: Partial<PluginStateEntry> = {},
): PluginStateEntry => ({
  name: 'foo-plugin',
  enabled: true,
  description: 'Foo plugin description',
  ...overrides,
});
