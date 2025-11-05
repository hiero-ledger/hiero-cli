/**
 * Zustand Generic State Service Implementation
 * Rich state management with actions, selectors, and subscriptions
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import {
  StateService,
  PluginStateManager,
  PluginStateSchema,
} from './state-service.interface';
import { Logger } from '../logger/logger-service.interface';
import * as fs from 'fs';
import * as path from 'path';
import { formatError } from '../../../utils/errors';

/**
 * Namespace Store Interface
 */
interface NamespaceStore {
  data: Record<string, unknown>;
  loading: boolean;
  error: string | null;

  // Actions
  setItem: (key: string, value: unknown) => void;
  getItem: (key: string) => unknown;
  removeItem: (key: string) => void;
  clear: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  list: () => unknown[];
  has: (key: string) => boolean;
  count: () => number;
  getKeys: () => string[];
}

/**
 * Create a Zustand store for a namespace
 */
function createNamespaceStore(
  namespace: string,
  logger: Logger,
  storageDir: string,
) {
  return create<NamespaceStore>()(
    devtools(
      persist(
        (set, get) => ({
          data: {},
          loading: false,
          error: null,

          setItem: (key: string, value: unknown) => {
            logger.debug(`[ZUSTAND:${namespace}] Setting key: ${key}`);
            set((state) => ({
              data: { ...state.data, [key]: value },
              error: null,
            }));
          },

          getItem: (key: string) => {
            logger.debug(`[ZUSTAND:${namespace}] Getting key: ${key}`);
            return get().data[key];
          },

          removeItem: (key: string) => {
            logger.debug(`[ZUSTAND:${namespace}] Removing key: ${key}`);
            set((state) => {
              const rest = { ...state.data } as Record<string, unknown>;
              delete rest[key];
              return { data: rest };
            });
          },

          clear: () => {
            logger.debug(`[ZUSTAND:${namespace}] Clearing all data`);
            set({ data: {}, error: null });
          },

          setLoading: (loading: boolean) => {
            set({ loading });
          },

          setError: (error: string | null) => {
            set({ error });
          },

          list: () => {
            logger.debug(`[ZUSTAND:${namespace}] Listing all items`);
            return Object.values(get().data);
          },

          has: (key: string) => {
            return key in get().data;
          },

          count: () => {
            return Object.keys(get().data).length;
          },

          getKeys: () => {
            return Object.keys(get().data);
          },
        }),
        {
          name: `${namespace}-storage`,
          storage: createJSONStorage(() => ({
            getItem: (name) => {
              try {
                const filePath = path.join(storageDir, `${name}.json`);

                if (fs.existsSync(filePath)) {
                  return fs.readFileSync(filePath, 'utf8');
                }
                return null;
              } catch (error) {
                logger.error(
                  formatError(
                    '[ZUSTAND:${namespace}] Failed to load: ${error}',
                    error,
                  ),
                );
                return null;
              }
            },
            setItem: (name, value) => {
              try {
                if (!fs.existsSync(storageDir)) {
                  fs.mkdirSync(storageDir, { recursive: true });
                }
                const filePath = path.join(storageDir, `${name}.json`);
                // Pretty-print the JSON for better readability
                const parsed: unknown = JSON.parse(value);
                const prettyJson = JSON.stringify(parsed, null, 2);
                fs.writeFileSync(filePath, prettyJson);
                logger.debug(`[ZUSTAND:${namespace}] Saved to: ${filePath}`);
              } catch (error) {
                logger.error(
                  formatError(
                    '[ZUSTAND:${namespace}] Failed to save: ${error}',
                    error,
                  ),
                );
              }
            },
            removeItem: (name) => {
              try {
                const filePath = path.join(storageDir, `${name}.json`);
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  logger.debug(`[ZUSTAND:${namespace}] Removed: ${filePath}`);
                }
              } catch (error) {
                logger.error(
                  formatError(
                    '[ZUSTAND:${namespace}] Failed to remove: ${error}',
                    error,
                  ),
                );
              }
            },
          })),
        },
      ),
      { name: `${namespace} Store` },
    ),
  );
}

/**
 * Zustand Generic State Service Implementation
 */
export class ZustandGenericStateServiceImpl implements StateService {
  private storageDir: string;
  private logger: Logger;
  private stores: Map<string, ReturnType<typeof createNamespaceStore>> =
    new Map();

  constructor(logger: Logger, storageDir?: string) {
    this.logger = logger;
    this.storageDir =
      storageDir || path.join(process.cwd(), '.hedera-cli', 'state');
    this.ensureStorageDir();

    // Discover existing namespaces from storage files
    this.discoverExistingNamespaces();
  }

  /**
   * Discover existing namespaces from storage files
   */
  private discoverExistingNamespaces(): void {
    if (!fs.existsSync(this.storageDir)) {
      return;
    }

    try {
      const files = fs.readdirSync(this.storageDir);
      const namespaces = new Set<string>();

      // Extract namespace names from storage filenames
      files.forEach((file) => {
        if (file.endsWith('-storage.json')) {
          const namespace = file.replace(/-storage\.json$/, '');
          namespaces.add(namespace);
        }
      });

      // Pre-initialize discovered namespaces
      for (const namespace of namespaces) {
        this.getOrCreateStore(namespace);
      }

      if (namespaces.size > 0) {
        this.logger.debug(
          `[ZUSTAND STATE] Discovered ${namespaces.size} existing namespaces: ${Array.from(namespaces).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.debug(
        `[ZUSTAND STATE] Failed to discover existing namespaces: ${String(error)}`,
      );
    }
  }

  /**
   * Register namespaces from loaded plugins
   */
  registerNamespaces(namespaces: string[]): void {
    for (const namespace of namespaces) {
      this.getOrCreateStore(namespace);
    }
    this.logger.debug(
      `[ZUSTAND STATE] Registered ${namespaces.length} namespaces: ${namespaces.join(', ')}`,
    );
  }

  /**
   * Get the storage directory path
   */
  getStorageDirectory(): string {
    return this.storageDir;
  }

  /**
   * Check if the state storage is initialized
   */
  isInitialized(): boolean {
    return fs.existsSync(this.storageDir);
  }

  get<T>(namespace: string, key: string): T | undefined {
    const store = this.getOrCreateStore(namespace);
    return store.getState().getItem(key) as T | undefined;
  }

  set<T>(namespace: string, key: string, value: T): void {
    const store = this.getOrCreateStore(namespace);
    store.getState().setItem(key, value);
  }

  delete(namespace: string, key: string): void {
    const store = this.getOrCreateStore(namespace);
    store.getState().removeItem(key);
  }

  list<T>(namespace: string): T[] {
    const store = this.getOrCreateStore(namespace);
    return store.getState().list() as T[];
  }

  clear(namespace: string): void {
    const store = this.getOrCreateStore(namespace);
    store.getState().clear();
  }

  has(namespace: string, key: string): boolean {
    const store = this.getOrCreateStore(namespace);
    return store.getState().has(key);
  }

  getNamespaces(): string[] {
    return Array.from(this.stores.keys());
  }

  getKeys(namespace: string): string[] {
    const store = this.getOrCreateStore(namespace);
    return store.getState().getKeys();
  }

  subscribe<T>(namespace: string, callback: (data: T[]) => void): () => void {
    const store = this.getOrCreateStore(namespace);
    return store.subscribe((state) => {
      callback(Object.values(state.data) as T[]);
    });
  }

  getActions(namespace: string): unknown {
    const store = this.getOrCreateStore(namespace);
    return store.getState();
  }

  getState(namespace: string): unknown {
    const store = this.getOrCreateStore(namespace);
    return store.getState();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      this.logger.debug(
        `[ZUSTAND STATE] Created storage directory: ${this.storageDir}`,
      );
    }
  }

  private getOrCreateStore(namespace: string) {
    if (!this.stores.has(namespace)) {
      const store = createNamespaceStore(
        namespace,
        this.logger,
        this.storageDir,
      );
      this.stores.set(namespace, store);
      this.logger.debug(
        `[ZUSTAND STATE] Created store for namespace: ${namespace}`,
      );
    }
    return this.stores.get(namespace)!;
  }
}

/**
 * Zustand Plugin State Manager Implementation
 */
export class ZustandPluginStateManagerImpl implements PluginStateManager {
  private namespace: string;
  private stateService: StateService;
  private logger: Logger;
  private schema?: PluginStateSchema;

  constructor(pluginName: string, stateService: StateService, logger: Logger) {
    this.namespace = pluginName;
    this.stateService = stateService;
    this.logger = logger;
  }

  defineSchema(schema: PluginStateSchema): void {
    this.schema = schema;
    this.logger.debug(
      `[${this.namespace}] Defined state schema for namespace: ${schema.namespace}`,
    );
  }

  get<T>(key: string): T | undefined {
    return this.stateService.get<T>(this.namespace, key);
  }

  set<T>(key: string, value: T): void {
    this.stateService.set(this.namespace, key, value);
  }

  delete(key: string): void {
    this.stateService.delete(this.namespace, key);
  }

  list<T>(): T[] {
    return this.stateService.list<T>(this.namespace);
  }

  clear(): void {
    this.stateService.clear(this.namespace);
  }

  has(key: string): boolean {
    return this.stateService.has(this.namespace, key);
  }

  getNamespace(): string {
    return this.namespace;
  }

  // Zustand-specific methods
  subscribe<T>(callback: (data: T[]) => void): () => void {
    return this.stateService.subscribe<T>(this.namespace, callback);
  }

  getActions(): unknown {
    return this.stateService.getActions(this.namespace);
  }

  getState(): unknown {
    return this.stateService.getState(this.namespace);
  }
}
