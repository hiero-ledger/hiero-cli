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
   * Get the storage directory path
   */
  getStorageDirectory(): string;

  /**
   * Check if the state storage is initialized
   */
  isInitialized(): boolean;
}
