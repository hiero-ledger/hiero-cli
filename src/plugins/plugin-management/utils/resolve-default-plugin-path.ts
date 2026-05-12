import { ValidationError } from '@/core/errors';
import { DEFAULT_PLUGIN_NAMES } from '@/core/shared/config/default-plugin-names';
import { getDefaultPluginPath } from '@/core/utils/get-default-plugin-path';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

export function resolveDefaultPluginPath(name: string): string {
  if (!DEFAULT_PLUGIN_NAMES.has(name)) {
    throw new ValidationError(ERROR_MESSAGES.pluginNotDefault(name), {
      context: { pluginName: name },
    });
  }
  return getDefaultPluginPath(name);
}
