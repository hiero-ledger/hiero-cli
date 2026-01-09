# Plugin Development Guide

Complete guide to creating, developing, and testing plugins for the Hiero CLI.

## 📋 Overview

The Hiero CLI uses a plugin-based architecture that allows developers to extend functionality without modifying the core codebase. This guide covers everything you need to know to create plugins and highlights where to find deeper reference material:

- [`docs/architecture.md`](docs/architecture.md) – system architecture
- [`docs/core-api.md`](docs/core-api.md) – full Core API reference
- [`docs/output-schemas-guide.md`](docs/output-schemas-guide.md) – Output schemas and templates

## 🏗️ Plugin Architecture

### Core Principles

- **Stateless Plugins**: Plugins are functionally stateless—they don't maintain internal state between command executions. Instead, all persistent data is managed through the Core API's State Service, which stores data in namespaced JSON files on disk. This ensures plugins can be reloaded, tested in isolation, and composed without side effects. Each command handler receives fresh service instances via dependency injection and returns deterministic results based solely on inputs and external state.
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Plugins declare capabilities via manifests
- **Namespace Isolation**: Each plugin has its own state namespace
- **Type Safety**: Full TypeScript support throughout

### Plugin Structure

```
my-plugin/
├── manifest.ts              # Plugin manifest (required)
├── commands/                # Command handlers
│   ├── create/
│   │   ├── handler.ts       # Command handler
│   │   ├── input.ts         # Input validation schema (Zod)
│   │   ├── output.ts        # Output schema & template
│   │   └── index.ts         # Command exports
│   ├── list/
│   │   ├── handler.ts
│   │   ├── input.ts         # Input validation schema (Zod)
│   │   ├── output.ts
│   │   └── index.ts
│   └── ...                  # Other commands
├── __tests__/               # Plugin tests
│   └── unit/                # Unit tests
│       ├── create.test.ts
│       ├── list.test.ts
│       └── helpers/         # Test helpers and mocks
├── schema.ts                # State schema (optional)
├── types.ts                 # Plugin-specific types (optional)
└── index.ts                 # Plugin entry point (optional)
```

## 📝 Creating a Plugin

### 1. Plugin Manifest

Every plugin must have a `manifest.ts` file that declares its capabilities:

```typescript
import { PluginManifest } from '../../core/plugins/plugin.interface';
import {
  MyPluginCreateOutputSchema,
  MY_PLUGIN_CREATE_TEMPLATE,
} from './commands/create';
import { createHandler } from './commands/create/handler';
import { MY_PLUGIN_NAMESPACE, MY_PLUGIN_JSON_SCHEMA } from './schema';

export const myPluginManifest: PluginManifest = {
  name: 'my-plugin',
  version: '1.0.0',
  displayName: 'My Plugin',
  description: 'A custom plugin for Hiero CLI',
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
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: true,
          description: 'Name of the item to create',
        },
        {
          name: 'value',
          short: 'v',
          type: 'string',
          required: false,
          description: 'Optional value for the item',
        },
      ],
      handler: createHandler,
      output: {
        schema: MyPluginCreateOutputSchema,
        humanTemplate: MY_PLUGIN_CREATE_TEMPLATE,
      },
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

Each entry in `commands` **must** provide an `output` block that references a Zod schema and (optionally) a template for human-readable output. The CLI relies on this metadata to validate `outputJson` and render results in line with [ADR-003](../docs/adr/ADR-003-command-handler-result-contract.md).

Human-readable output templates use [Handlebars](https://handlebarsjs.com/) syntax for variable interpolation, conditionals, and iteration. Handlebars allows you to create flexible, readable output formats using expressions like `{{variable}}` for interpolation, `{{#if condition}}...{{/if}}` for conditionals, and `{{#each items}}...{{/each}}` for loops.

#### Output Schema and Template (commands/create/output.ts)

```typescript
export const MY_PLUGIN_CREATE_TEMPLATE = `
✅ Created entry {{name}}
   Account: {{accountId}}
   Value: {{value}}
   Created: {{createdAt}}
`.trim();
```

### 2. Input Validation

**All commands must validate user input** using Zod schemas defined in `input.ts`. This ensures consistent error handling and prevents invalid data from reaching business logic.

#### Input Schema (commands/create/input.ts)

```typescript
import { z } from 'zod';
import {
  AccountReferenceSchema,
  EntityReferenceSchema,
} from '../../../core/schemas/common-schemas';

/**
 * Input schema for create command
 * Validates all user-provided arguments
 */
export const MyPluginCreateInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.string().optional(),
  account: AccountReferenceSchema.optional().describe(
    'Optional account identifier',
  ),
});

export type MyPluginCreateInput = z.infer<typeof MyPluginCreateInputSchema>;
```

**Key principles:**

- Define one schema per command in `input.ts`
- Use common schemas from `src/core/schemas/common-schemas.ts` for consistency
- Add descriptive error messages using `.min()`, `.max()`, etc.
- Use `.describe()` for documentation
- Export TypeScript type using `z.infer<>`

### 3. Command Handlers

Command handlers validate input **at the beginning**, before business logic. Validation errors are automatically caught by the plugin manager and formatted for the user.

```typescript
import { CommandHandlerArgs } from '../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../core/plugins/plugin.types';
import { Status } from '../../../core/shared/constants';
import { MyPluginCreateInputSchema } from './input';
import { MyPluginCreateOutputSchema } from './output';

export async function createHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger, state } = args;

  // Validate input FIRST, before try-catch
  // ZodError is thrown if validation fails and caught by plugin manager
  const validArgs = MyPluginCreateInputSchema.parse(args.args);

  logger.info(`Creating item: ${validArgs.name}`);

  try {
    // Business logic with validated data
    const result = await api.account.createAccount({
      name: validArgs.name,
      balance: 1000,
    });

    const output = MyPluginCreateOutputSchema.parse({
      name: validArgs.name,
      value: validArgs.value,
      accountId: result.accountId,
      createdAt: new Date().toISOString(),
    });

    state.set('my-plugin-data', validArgs.name, output);

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: `Failed to create item: ${String(error)}`,
    };
  }
}
```

**Validation flow:**

1. Handler calls `InputSchema.parse(args.args)` **before** business logic
2. If validation fails, Zod throws `ZodError`
3. Plugin manager catches `ZodError` in try-catch around handler execution
4. Error handler formats validation errors:
   - **Text format**: Bulletpoint list of all validation errors
   - **JSON format**: `{ status: "failure", errorMessage: "...", errors: [...] }`
5. CLI exits with error code 1

**Never catch ZodError in handlers** - let it propagate to the plugin manager for consistent error formatting.

### 4. State Management

Plugins can define state schemas for data validation using Zod schemas that are automatically converted to JSON Schema:

```typescript
// schema.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  EntityIdSchema,
  IsoTimestampSchema,
} from '../../core/schemas/common-schemas';

// Define Zod schema for runtime validation (state)
export const MyPluginDataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.string().optional(),
  accountId: EntityIdSchema,
  createdAt: IsoTimestampSchema,
});

export type MyPluginData = z.infer<typeof MyPluginDataSchema>;

export const MY_PLUGIN_JSON_SCHEMA = zodToJsonSchema(MyPluginDataSchema);
export const MY_PLUGIN_NAMESPACE = 'my-plugin-data';

// Output schema reused by manifest + handler
export const MyPluginCreateOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string(),
  value: z.string().optional(),
  createdAt: IsoTimestampSchema,
});
```

> ℹ️ Reusing the validators from `src/core/schemas/common-schemas.ts` keeps error messaging consistent and prevents reimplementing complex regular expressions in plugins.

**Benefits of this approach:**

- **Single Source of Truth**: Schema is defined once in Zod and automatically converted to JSON Schema
- **Type Safety**: TypeScript types are automatically inferred from the Zod schema
- **Runtime Validation**: Use Zod for runtime validation with detailed error messages
- **No Duplication**: Eliminates the need to maintain separate JSON Schema definitions
- **Consistency**: Changes to the Zod schema automatically update the JSON Schema

### 5. Type Definitions

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

Plugins interact with the Hedera network exclusively through the Core API. Command handlers receive an `api` instance via dependency injection, so every capability is available without manual wiring:

- account and token operations
- topic management
- transaction execution
- alias and KMS utilities
- state persistence
- mirror node queries
- network configuration
- CLI configuration
- structured logging
- output formatting

- **How to use**: extract `api` from `CommandHandlerArgs` and call the service you need (e.g. `api.token.createTokenAssociationTransaction`, `api.mirror.getAccount`, `api.output.handleCommandOutput`).
- **Best practice**: keep service usage close to business logic; avoid recreating SDK clients manually—Core API already manages credentials, network selection, and output handling.

For a complete reference (interfaces, return types, advanced usage patterns), see [`docs/core-api.md`](docs/core-api.md).

## 🖨️ Output Formatting Pipeline

Command handlers hand off their structured results to the Core API’s output service. Under the hood, `api.output.handleCommandOutput`:

- parses `outputJson` (throws if the payload is not valid JSON);
- selects the correct formatter strategy (`human` → template renderer, `json` → serializer) via `OutputFormatterFactory`;
- applies the optional Handlebars-like template when rendering human output;
- writes the final string either to stdout or to `--output <path>`.

## 🧪 Testing Plugins

### 1. Unit Testing

Create unit tests for your command handlers:

```typescript
// __tests__/unit/create.test.ts
import { createHandler } from '../commands/create/handler';
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

### 2. Testing Handler Interactions

Test how multiple handlers work together or test handlers with complex service interactions:

```typescript
// __tests__/unit/handler-integration.test.ts
import { createHandler } from '../commands/create/handler';
import { listHandler } from '../commands/list/handler';
import { CommandHandlerArgs } from '../../../core/plugins/plugin.interface';
import { Status } from '../../../core/shared/constants';
import {
  makeLogger,
  makeArgs,
} from '../../../core/shared/__tests__/helpers/mocks';
import { makeApiMocks } from './helpers/mocks';

describe('Handler Integration', () => {
  it('should create and list items together', async () => {
    const logger = makeLogger();
    const api = makeApiMocks();
    const state = {
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
    };

    const createArgs: CommandHandlerArgs = {
      args: { name: 'test-item' },
      api,
      state,
      logger,
    };

    // Create an item
    const createResult = await createHandler(createArgs);
    expect(createResult.status).toBe(Status.Success);
    expect(state.set).toHaveBeenCalled();

    // List items
    const listArgs: CommandHandlerArgs = {
      args: {},
      api,
      state: {
        ...state,
        list: jest.fn().mockReturnValue([{ name: 'test-item' }]),
      },
      logger,
    };

    const listResult = await listHandler(listArgs);
    expect(listResult.status).toBe(Status.Success);
    expect(listResult.outputJson).toContain('test-item');
  });
});
```

### 3. Output Structure Compliance

Ensure your plugins comply with the [ADR-003 command handler result contract](../docs/adr/ADR-003-command-handler-result-contract.md). This contract defines the structure that command handlers must return.

- Write focused tests that assert every handler returns a `CommandExecutionResult` for both success and failure paths. See [`src/plugins/token/__tests__/unit/adr003-compliance.test.ts`](../src/plugins/token/__tests__/unit/adr003-compliance.test.ts) for a reusable pattern.
- Mock the services injected via `CommandHandlerArgs` so you can inspect `status`, `errorMessage`, and `outputJson` without hitting the network or filesystem.
- Treat regression tests for reserved option filtering and output schema validation as part of the output structure compliance test suite.

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
  "name": "@hiero-ledger/hiero-cli-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My custom Hiero CLI plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/**/*"],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@hiero-ledger/hiero-cli": "^1.0.0"
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

### 1. Input Validation

Always validate input using Zod schemas:

```typescript
export async function myHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  // Validate FIRST, before any business logic
  const validArgs = MyInputSchema.parse(args.args);

  // Now use validated data with full type safety
  logger.info(`Processing ${validArgs.name}`);

  // ... business logic with validArgs
}
```

**Important:**

- Call `.parse()` **before** the try-catch block for business logic
- Don't catch `ZodError` - let it propagate to plugin manager
- Use common schemas from `src/core/schemas/common-schemas.ts`
- Add descriptive validation messages

### 2. Error Handling

Always handle errors gracefully:

```typescript
export async function myHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;

  // Input validation (outside try-catch)
  const validArgs = MyInputSchema.parse(args.args);

  try {
    // Plugin business logic
    return { status: Status.Success };
  } catch (error) {
    logger.error(`❌ Plugin error: ${String(error)}`);
    return {
      status: Status.Failure,
      errorMessage: 'Operation failed – see logs for details',
    };
  }
}
```

### 3. State Management

Use proper namespacing for state:

```typescript
// Good: Use plugin-specific namespace
api.state.set('my-plugin-data', 'key', data);

// Bad: Don't use generic namespaces
api.state.set('data', 'key', data);
```

### 4. Command Options

Define clear, descriptive command options. Each option can have both a long form (`--name`) and a short form (`-n`) for convenience:

```typescript
{
  name: 'create',
  options: [
    {
      name: 'name',
      short: 'n',
      type: 'string',
      required: true,
      description: 'Name of the item to create'
    },
    {
      name: 'balance',
      short: 'b',
      type: 'number',
      required: false,
      default: 1000,
      description: 'Initial balance in tinybars'
    },
    {
      name: 'key-type',
      short: 't',
      type: 'string',
      required: false,
      default: 'ECDSA',
      description: 'Key type for the account'
    },
  ],
}
```

**Usage in CLI:**
Both long and short forms can be used interchangeably:

```bash
# Using long forms
my-plugin create --name my-item --balance 1000 --key-type ECDSA

# Using short forms
my-plugin create -n my-item -b 1000 -t ECDSA

# Mixing long and short forms
my-plugin create --name my-item -b 1000 -t ECDSA
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
- `--network` / `-N` - Global network override flag

**Important:** If your plugin defines a reserved option, it will be silently filtered during command registration. You will see a warning message indicating which options were filtered. Use alternative option names for your plugin-specific functionality.

### 5. Documentation

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

The CLI uses a config-based logging system. To enable debug logging, set the `log_level` config option:

```bash
# Set log level to debug (persists across CLI invocations)
node dist/hiero-cli.js config set -o log_level -v debug

# Now run your plugin command with debug output
node dist/hiero-cli.js my-plugin create --name test
```

Available log levels: `silent` (default), `error`, `warn`, `info`, `debug`. All logger output is written to stderr, so command output on stdout remains clean.

### 2. Plugin Development Mode

```bash
# Watch for changes during development
npm run dev

# In another terminal, test the plugin
node dist/hiero-cli.js my-plugin create --name test
```

### 3. State Inspection

```bash
# View plugin state stored under .hiero-cli/state

# macOS / Linux
cat .hiero-cli/state/my-plugin-data-storage.json | jq '.'

# Windows PowerShell
Get-Content .hiero-cli/state/my-plugin-data-storage.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## 📖 Related Documentation

- [Architecture Overview](docs/architecture.md)
- [Core API Reference](docs/core-api.md)
- [Contributing Guide](docs/contributing.md)
- [Architecture Decision Records](docs/adr/) - ADRs for interested developers
- Plugin-specific READMEs: `src/plugins/<plugin-name>/README.md`
