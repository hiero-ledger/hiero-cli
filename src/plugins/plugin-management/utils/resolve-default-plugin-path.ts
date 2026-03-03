import { ValidationError } from '@/core/errors';
import { DEFAULT_PLUGIN_STATE } from '@/core/shared/config/cli-options';
import { getDefaultPluginPath } from '@/core/utils/get-default-plugin-path';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

export function resolveDefaultPluginPath(name: string): string {
  const defaultPluginNames = new Set(DEFAULT_PLUGIN_STATE.map((m) => m.name));
  if (!defaultPluginNames.has(name)) {
    throw new ValidationError(ERROR_MESSAGES.pluginNotDefault(name), {
      context: { pluginName: name },
    });
  }
  return getDefaultPluginPath(name);
}
