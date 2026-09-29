import * as path from 'path';

import { ValidationError } from '@/core/errors';
import { DEFAULT_PLUGIN_STATE } from '@/core/shared/config/cli-options';
import { DEFAULT_PLUGIN_NAMES } from '@/core/shared/config/default-plugin-names';
import { resolveDefaultPluginPath } from '@/plugins/plugin-management/utils/resolve-default-plugin-path';

describe('resolveDefaultPluginPath', () => {
  it.each(DEFAULT_PLUGIN_STATE.map((manifest) => manifest.name))(
    'should resolve the built-in plugin "%s" by name',
    (pluginName) => {
      expect(resolveDefaultPluginPath(pluginName)).toBe(
        path.resolve(__dirname, '../../../../plugins', pluginName),
      );
    },
  );

  it('should list exactly the plugins registered as default at startup', () => {
    expect([...DEFAULT_PLUGIN_NAMES].sort()).toEqual(
      DEFAULT_PLUGIN_STATE.map((manifest) => manifest.name).sort(),
    );
  });

  it('should reject a plugin that is not a default plugin', () => {
    expect(() => resolveDefaultPluginPath('custom-plugin')).toThrow(
      ValidationError,
    );
  });
});
