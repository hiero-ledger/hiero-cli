/**
 * Error messages for plugin-management commands
 * Centralized error message constants for consistent error handling
 */

export const ERROR_MESSAGES = {
  pluginNotFound: (name: string) =>
    `Plugin ${name} not found in plugin-management state`,
  pluginAlreadyEnabled: (name: string) => `Plugin ${name} is already enabled`,
  pluginAlreadyDisabled: (name: string) => `Plugin ${name} is already disabled`,
  pluginProtectedCannotDisable: (name: string) =>
    `Plugin ${name} is protected and cannot be disabled`,
  pluginProtectedCannotRemove: (name: string) =>
    `Plugin ${name} is a core plugin and cannot be removed from state via CLI`,
} as const;
