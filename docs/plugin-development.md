# Plugin Development Guide

Complete guide to creating, developing, and testing plugins for the Hedera CLI.

## 📋 Overview

The Hedera CLI uses a plugin-based architecture that allows developers to extend functionality without modifying the core codebase. This guide covers everything you need to know to create plugins.

## 🏗️ Plugin Architecture

### Core Principles

- **Stateless Plugins**: Plugins are functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Plugins declare capabilities via manifests
- **Namespace Isolation**: Each plugin has its own state namespace
- **Type Safety**: Full TypeScript support throughout

### Plugin Structure

```
my-plugin/
├── manifest.ts              # Plugin manifest (required)
├── commands/                # Command handlers
│   ├── create.ts
│   ├── list.ts
│   └── ...
├── schema.ts                # State schema (optional)
├── types.ts                 # Plugin-specific types (optional)
└── index.ts                 # Plugin entry point (optional)
```

## 📝 Creating a Plugin

### 1. Plugin Manifest

Every plugin must have a `manifest.ts` file that declares its capabilities:

```typescript
import { PluginManifest } from '../../core/plugins/plugin.interface';

export const myPluginManifest: PluginManifest = {
  name: 'my-plugin',
  version: '1.0.0',
  displayName: 'My Plugin',
  description: 'A custom plugin for Hedera CLI',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  capabilities: [
    'state:namespace:my-plugin-data',
    'network:read',
    'signing:use',
  ],
  commands: [
    {
      name: 'create',
      summary: 'Create a new item',
      description: 'Create a new item in the system',
      options: [
        { name: 'name', type: 'string', required: true },
        { name: 'value', type: 'string', required: false },
      ],
      handler: './commands/create',
    },
  ],
  stateSchemas: [
    {
      namespace: MY_PLUGIN_NAMESPACE,
      version: 1,
      jsonSchema: MY_PLUGIN_JSON_SCHEMA,
      scope: 'profile',
    },
  ],
  init: async (context) => {
    console.log('[MY PLUGIN] Initializing...');
  },
  teardown: async (context) => {
    console.log('[MY PLUGIN] Cleaning up...');
  },
};
```

### 2. Command Handlers

Command handlers are the core of plugin functionality. Each command handler receives injected services:

```typescript
import { CommandHandlerArgs } from '../../../core/plugins/plugin.interface';

export async function createHandler(args: CommandHandlerArgs): Promise<void> {
  const { api, logger, state } = args;

  // Extract command arguments
  const name = args.args['name'] as string;
  const value = args.args['value'] as string;

  logger.log(`Creating item: ${name}`);

  try {
    // Use Core API services
    const result = await api.account.createAccount({
      name,
      balance: 1000,
    });

    // Store in plugin state
    state.set('my-plugin-data', name, {
      name,
      value,
      accountId: result.accountId,
      createdAt: new Date().toISOString(),
    });

    logger.log(`✅ Item created successfully: ${result.accountId}`);
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Failed to create item: ${error}`);
    process.exit(1);
  }
}
```

### 3. State Management

Plugins can define state schemas for data validation using Zod schemas that are automatically converted to JSON Schema:

```typescript
// schema.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Define Zod schema for runtime validation
export const MyPluginDataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.string().optional(),
  accountId: z.string().regex(/^0\.0\.[0-9]+$/, 'Invalid account ID format'),
  createdAt: z.string(),
});

// TypeScript type inferred from Zod schema
export type MyPluginData = z.infer<typeof MyPluginDataSchema>;

// JSON Schema for manifest (automatically generated from Zod)
export const MY_PLUGIN_JSON_SCHEMA = zodToJsonSchema(MyPluginDataSchema);

export const MY_PLUGIN_NAMESPACE = 'my-plugin-data';
```

**Benefits of this approach:**

- **Single Source of Truth**: Schema is defined once in Zod and automatically converted to JSON Schema
- **Type Safety**: TypeScript types are automatically inferred from the Zod schema
- **Runtime Validation**: Use Zod for runtime validation with detailed error messages
- **No Duplication**: Eliminates the need to maintain separate JSON Schema definitions
- **Consistency**: Changes to the Zod schema automatically update the JSON Schema

### 4. Type Definitions

Define plugin-specific types:

```typescript
// types.ts
export interface MyPluginData {
  name: string;
  value?: string;
  accountId: string;
  createdAt: string;
}

export interface CreateItemParams {
  name: string;
  value?: string;
}
```

## 🛠️ Core API Services

### Available Services

Plugins have access to the following services through the Core API:

#### 1. Account Transaction Service

```typescript
// Create accounts
const result = await api.account.createAccount({
  name: 'my-account',
  balance: 1000,
  maxAutoAssociations: 10,
});
```

#### 2. TxExecutionService

```typescript
// Sign and execute transactions
const receipt = await api.txExecution.signAndExecute(transaction);
```

#### 3. State Service

```typescript
// Store and retrieve data
api.state.set('my-namespace', 'key', data);
const data = api.state.get('my-namespace', 'key');
const hasData = api.state.has('my-namespace', 'key');
```

#### 4. Mirror Node Service

```typescript
// Get account information
const account = await api.mirror.getAccount('0.0.123456');
const balance = await api.mirror.getAccountHBarBalance('0.0.123456');
const tokenBalances = await api.mirror.getAccountTokenBalances('0.0.123456');
```

#### 5. Network Service

```typescript
// Get current network
const network = api.network.getCurrentNetwork();
const config = api.network.getNetworkConfig(network);
```

#### 6. Config Service

```typescript
// Access configuration
const config = api.config.getConfig();
const value = api.config.getValue('key');
```

#### 7. Logger Service

```typescript
// Logging
api.logger.log('Info message');
api.logger.error('Error message');
api.logger.warn('Warning message');
```

#### 8. Network Service (Operator Management)

```typescript
// Get current network
const network = api.network.getCurrentNetwork();

// Get operator for current network
const operator = api.network.getOperator(network);

// Set operator for specific network
api.network.setOperator('testnet', {
  accountId: '0.0.123456',
  keyRefId: 'kr_test123',
});
```

## 🧪 Testing Plugins

### 1. Unit Testing

Create unit tests for your command handlers:

```typescript
// __tests__/commands/create.test.ts
import { createHandler } from '../commands/create';
import { CommandHandlerArgs } from '../../../core/plugins/plugin.interface';

describe('Create Command', () => {
  it('should create an item successfully', async () => {
    const mockArgs: CommandHandlerArgs = {
      args: { name: 'test-item', value: 'test-value' },
      api: {
        account: {
          createAccount: jest.fn().mockResolvedValue({
            accountId: '0.0.123456',
          }),
        },
        // ... other services
      },
      state: {
        set: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
      },
      config: {
        getConfig: jest.fn(),
        getValue: jest.fn(),
      },
      logger: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      },
    };

    await createHandler(mockArgs);

    expect(mockArgs.api.account.createAccount).toHaveBeenCalledWith({
      name: 'test-item',
      balance: 1000,
    });
    expect(mockArgs.state.set).toHaveBeenCalledWith(
      'my-plugin-data',
      'test-item',
      expect.objectContaining({
        name: 'test-item',
        value: 'test-value',
      }),
    );
  });
});
```

### 2. Integration Testing

Test plugins with the full CLI:

```typescript
// __tests__/integration.test.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Plugin Integration', () => {
  it('should execute plugin commands', async () => {
    const { stdout } = await execAsync(
      'node dist/hedera-cli.js my-plugin create --name test',
    );

    expect(stdout).toContain('Creating item: test');
    expect(stdout).toContain('✅ Item created successfully');
  });
});
```

## 📦 Plugin Distribution

### 1. Package Structure

Create a proper npm package structure:

```
my-hedera-plugin/
├── package.json
├── src/
│   ├── manifest.ts
│   ├── commands/
│   └── ...
├── dist/                     # Built files
├── __tests__/
├── README.md
└── LICENSE
```

### 2. Package.json

```json
{
  "name": "@hashgraph/hedera-cli-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My custom Hedera CLI plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/**/*"],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@hashgraph/hedera-cli": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  },
  "keywords": ["hedera", "cli", "plugin", "blockchain"]
}
```

### 3. Building and Publishing

```bash
# Build the plugin
npm run build

# Test the plugin
npm test

# Publish to npm
npm publish
```

## 🔧 Development Tools

### 1. TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

### 2. Jest Configuration

```json
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src", "<rootDir>/__tests__"],
  "testMatch": ["**/__tests__/**/*.test.ts"],
  "collectCoverageFrom": ["src/**/*.ts", "!src/**/*.d.ts"]
}
```

## 🚀 Advanced Plugin Development

### 1. Plugin Dependencies

Plugins can depend on other plugins:

```typescript
// In manifest.ts
export const myPluginManifest: PluginManifest = {
  // ... other properties
  dependencies: ['account', 'credentials'],
  // ...
};
```

### 2. Custom Services

Plugins can provide their own services:

```typescript
// In manifest.ts
export const myPluginManifest: PluginManifest = {
  // ... other properties
  services: [
    {
      name: 'my-service',
      interface: 'MyServiceInterface',
      implementation: './services/my-service',
    },
  ],
  // ...
};
```

### 3. Plugin Events

Plugins can emit and listen to events:

```typescript
// Emit events
api.events.emit('my-plugin:item-created', { itemId: '123' });

// Listen to events
api.events.on('account:created', (data) => {
  console.log('Account created:', data);
});
```

## 📚 Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
export async function myHandler(args: CommandHandlerArgs): Promise<void> {
  const { logger } = args;

  try {
    // Plugin logic
  } catch (error) {
    logger.error(`❌ Plugin error: ${error.message}`);
    process.exit(1);
  }
}
```

### 2. State Management

Use proper namespacing for state:

```typescript
// Good: Use plugin-specific namespace
api.state.set('my-plugin-data', 'key', data);

// Bad: Don't use generic namespaces
api.state.set('data', 'key', data);
```

### 3. Command Options

Define clear, descriptive command options:

```typescript
{
  name: 'create',
  options: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Name of the item to create'
    },
    {
      name: 'balance',
      type: 'number',
      required: false,
      default: 1000,
      description: 'Initial balance in tinybars'
    },
  ],
}
```

#### Reserved Options

The following CLI options are reserved by the core CLI and cannot be used in plugin commands. If your plugin attempts to define any of these options, they will be automatically filtered out and a warning will be displayed:

- `--format` - Output format control
- `--json` - Legacy JSON output flag
- `--output` - Output file destination
- `--script` - Script mode flag
- `--color` / `--no-color` - ANSI color control
- `--verbose` / `-v` - Verbose logging
- `--quiet` / `-q` - Quiet mode
- `--debug` - Debug logging
- `--help` / `-h` - Help display
- `--version` / `-V` - Version display

**Important:** If your plugin defines a reserved option, it will be silently filtered during command registration. You will see a warning message indicating which options were filtered. Use alternative option names for your plugin-specific functionality.

### 4. Documentation

Document your plugin thoroughly:

```typescript
/**
 * Creates a new item in the system
 *
 * @param args - Command arguments
 * @param args.args.name - Name of the item
 * @param args.args.value - Optional value for the item
 */
export async function createHandler(args: CommandHandlerArgs): Promise<void> {
  // Implementation
}
```

## 🔍 Debugging Plugins

### 1. Enable Debug Logging

```bash
# Run with debug logging
DEBUG=* node dist/hedera-cli.js my-plugin create --name test
```

### 2. Plugin Development Mode

```bash
# Watch for changes during development
npm run dev

# In another terminal, test the plugin
node dist/hedera-cli.js my-plugin create --name test
```

### 3. State Inspection

```bash
# View plugin state
node dist/hedera-cli.js state-management list --namespace my-plugin-data
```

## 📖 Related Documentation

- [Architecture Overview](./architecture.md)
- [Core API Reference](./core-api.md)
- [Contributing Guide](./contributing.md)
- [ADR-001 Plugin Architecture](./adr/ADR-001-plugin-architecture.md)
