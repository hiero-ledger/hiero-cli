/**
 * Zustand State Service Interface
 * Rich state management with actions, selectors, and subscriptions
 */
export interface StateService {
  /**
   * Get a value from a namespace
   */
  get<T>(namespace: string, key: string): T | undefined;

  /**
   * Set a value in a namespace
   */
  set<T>(namespace: string, key: string, value: T): void;

  /**
   * Delete a value from a namespace
   */
  delete(namespace: string, key: string): void;

  /**
   * List all values in a namespace
   */
  list<T>(namespace: string): T[];

  /**
   * Clear all values in a namespace
   */
  clear(namespace: string): void;

  /**
   * Check if a key exists in a namespace
   */
  has(namespace: string, key: string): boolean;

  /**
   * Get all namespaces
   */
  getNamespaces(): string[];

  /**
   * Get all keys in a namespace
   */
  getKeys(namespace: string): string[];

  /**
   * Subscribe to namespace changes
   */
  subscribe<T>(namespace: string, callback: (data: T[]) => void): () => void;

  /**
   * Get store actions for a namespace
   */
  getActions(namespace: string): unknown;

  /**
   * Get store state for a namespace
   */
  getState(namespace: string): unknown;

  /**
   * Register namespaces from loaded plugins
   */
  registerNamespaces(namespaces: string[]): void;

  /**
   * Get the storage directory path
   */
  getStorageDirectory(): string;

  /**
   * Check if the state storage is initialized
   */
  isInitialized(): boolean;
}

/**
 * Plugin State Schema Definition
 */
export interface PluginStateSchema {
  namespace: string;
  version: string;
  schema: Record<string, unknown>; // JSON Schema or similar
  description?: string;
}

/**
 * Plugin State Manager
 * Provides easy state management for plugins
 */
export interface PluginStateManager {
  /**
   * Define a state schema for the plugin
   */
  defineSchema(schema: PluginStateSchema): void;

  /**
   * Get a value from plugin's namespace
   */
  get<T>(key: string): T | undefined;

  /**
   * Set a value in plugin's namespace
   */
  set<T>(key: string, value: T): void;

  /**
   * Delete a value from plugin's namespace
   */
  delete(key: string): void;

  /**
   * List all values in plugin's namespace
   */
  list<T>(): T[];

  /**
   * Clear all values in plugin's namespace
   */
  clear(): void;

  /**
   * Check if a key exists in plugin's namespace
   */
  has(key: string): boolean;

  /**
   * Get plugin's namespace
   */
  getNamespace(): string;
}
