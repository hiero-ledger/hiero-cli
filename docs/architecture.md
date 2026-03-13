# Architecture Overview

This document provides a comprehensive overview of the Hiero CLI architecture, focusing on the plugin system, core services, and how everything works together.

## 🏗️ High-Level Architecture

The Hiero CLI is built on a plugin-based architecture designed to be extensible, maintainable, and secure.

```
┌─────────────────────────────────────────────────────────────┐
│                    Hiero CLI Architecture                   │
├─────────────────────────────────────────────────────────────┤
│  CLI Entry Point (hiero-cli.ts)                             │
│  ├── Plugin Manager                                         │
│  ├── Core API                                               │
│  └── Command Router                                         │
├─────────────────────────────────────────────────────────────┤
│  Core Services Layer                                        │
│  ├── Account Transaction Service                            │
│  ├── Token Service                                          │
│  ├── Topic Service                                          │
│  ├── TxExecutionService                                     │
│  ├── Receipt Service                                        │
│  ├── State Service (Zustand)                                │
│  ├── Mirror Node Service                                    │
│  ├── Network Service                                        │
│  ├── Config Service                                         │
│  ├── Logger Service                                         │
│  ├── KMS Service                                            │
│  ├── Alias Service                                          │
│  ├── HBAR Service                                           │
│  └── Output Service                                         │
├─────────────────────────────────────────────────────────────┤
│  Plugin Layer                                               │
│  ├── Account Plugin                                         │
│  ├── Token Plugin                                           │
│  ├── Network Plugin                                         │
│  ├── Topic Plugin                                           │
│  ├── HBAR Plugin                                            │
│  ├── Credentials Plugin                                     │
│  ├── Config Plugin                                          │
│  ├── Plugin Management Plugin                               │
│  ├── Contract Plugin                                        │
│  ├── Contract ERC-20 Plugin                                 │
│  ├── Contract ERC-721 Plugin                                │
│  └── [Custom Plugins]                                       │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 Plugin Architecture

### Core Principles

The plugin architecture follows these key principles:

1. **Stateless Plugins**: Plugins are functionally stateless
2. **Dependency Injection**: Services are injected into command handlers
3. **Manifest-Driven**: Plugins declare commands and output specs via manifests
4. **Namespace Isolation**: Each plugin has its own state namespace
5. **Type Safety**: Full TypeScript support throughout

### Plugin Lifecycle

```
Plugin Discovery → Validation → Loading → Initialization → Command Registration
                                                                    ↓
Command Execution ← Command Routing ← User Input ← CLI Interface
```

### Plugin Structure

Plugins are regular TypeScript modules located under `src/plugins/<plugin-name>/` and follow a consistent folder layout:

```
plugin/
├── manifest.ts              # Plugin manifest (name, commands, output specs)
├── schema.ts                # State/output schemas (Zod + JSON Schema)
├── commands/                # One folder per command
│   ├── create/
│   │   ├── handler.ts       # Command handler
│   │   ├── output.ts        # Output schema & template
│   │   └── index.ts         # Command exports
│   ├── list/
│   │   ├── handler.ts
│   │   ├── output.ts
│   │   └── index.ts
│   └── ...                  # Other commands
├── README.md                # Plugin-specific documentation
└── __tests__/
    └── unit/                # Unit tests for handlers/schemas
```

For a detailed, step‑by‑step plugin development guide, see [`PLUGIN_ARCHITECTURE_GUIDE.md`](../PLUGIN_ARCHITECTURE_GUIDE.md) in the repository root.

## 🛠️ Core Services

### 1. Account Service

**Purpose**: Handles Hedera account creation and management operations.

**Key Features**:

- Account creation with custom parameters
- Key generation and management
- Transaction building and validation

**Interface**:

```typescript
interface AccountService {
  createAccount(params: CreateAccountParams): Promise<AccountCreateResult>;
  // ... other methods
}
```

### 2. TxExecutionService

**Purpose**: Manages transaction signing and execution.

**Key Features**:

- Transaction signing with operator credentials
- Transaction broadcasting to Hedera network
- Credential management integration

**Interface**:

```typescript
interface TxExecutionService {
  signAndExecute(transaction: Transaction): Promise<TransactionReceipt>;
  // ... other methods
}
```

### 3. State Service

**Purpose**: Provides namespaced, versioned state management.

**Key Features**:

- Zustand-based state management
- Namespace isolation
- Schema validation
- Persistent storage

**Interface**:

```typescript
interface StateService {
  set<T>(namespace: string, key: string, value: T): void;
  get<T>(namespace: string, key: string): T | undefined;
  has(namespace: string, key: string): boolean;
  // ... other methods
}
```

### 4. Mirror Node Service

**Purpose**: Provides comprehensive access to Hedera Mirror Node API.

**Key Features**:

- Real-time account information
- Balance queries
- Transaction history
- Token information
- Topic messages
- Contract information

**Interface**:

```typescript
interface HederaMirrornodeService {
  getAccount(accountId: string): Promise<AccountResponse>;
  getAccountHBarBalance(accountId: string): Promise<bigint>;
  getAccountTokenBalances(
    accountId: string,
    tokenId?: string,
  ): Promise<TokenBalancesResponse>;
  getTopicMessages(
    queryParams: TopicMessagesQueryParams,
  ): Promise<TopicMessagesResponse>;
  // ... other methods
}
```

### 5. Network Service

**Purpose**: Manages network configuration and selection.

**Key Features**:

- Network switching
- Configuration management
- Health monitoring

### 6. Config Service

**Purpose**: Manages configuration options for the CLI with type-safe accessors.

**Key Features**:

- Generic configuration option accessors
- Type validation (boolean, number, string, enum)
- Default value support for all options
- State-based persistent storage
- Options discovery and listing

**Interface**:

```typescript
interface ConfigService {
  listOptions(): ConfigOptionDescriptor[];
  getOption<T = boolean | number | string>(name: string): T;
  setOption(name: string, value: boolean | number | string): void;
}
```

**Configuration Options**:

The service supports the following option types:

- `boolean`: Boolean values
- `number`: Numeric values
- `string`: String values
- `enum`: String values restricted to predefined allowed values

Configuration options include:

- `ed25519_support_enabled` (boolean, default: false)
- `default_key_manager` (enum: 'local' | 'local_encrypted', default: 'local')
- `log_level` (enum: 'silent' | 'error' | 'warn' | 'info' | 'debug', default: 'silent')
- `skip_confirmations` (boolean, default: false)

**Implementation Details**:

- Uses State Service with `'config'` namespace for persistent storage
- Validates types on both read and write operations
- Returns default values if options are not explicitly set
- Throws descriptive errors for invalid option names or values

### 7. Plugin Management Service

**Purpose**: Manages plugin registration state (add, remove, enable, disable) and tracks which default plugins have been initialized.

**Key Features**:

- Plugin CRUD operations (add, remove, enable, disable)
- Auto-initialization of new default plugins when they appear in `DEFAULT_PLUGIN_STATE`
- Respects user preference: default plugins explicitly removed stay removed

**Implementation Details**:

- Uses State Service with `'plugin-management'` namespace
- State file: `~/.hiero-cli/state/plugin-management-storage.json`
- `initialized-defaults` key: metadata listing default plugin names ever initialized; ensures new defaults are added on CLI updates while user-removed defaults are not re-added
- Custom plugins are never tracked in `initialized-defaults`; they are fully removed when the user runs `remove`

### 8. Logger Service

**Purpose**: Provides structured logging capabilities.

**Key Features**:

- Multiple log levels
- Structured output
- Plugin-specific logging

### 9. Receipt Service

**Purpose**: Fetches transaction receipts by transaction ID using Hedera's `TransactionGetReceiptQuery`.

**Key Features**:

- Retrieve receipt data for any submitted transaction
- Returns `TransactionResult` with status, entity IDs (account, token, topic, contract), and serials
- Used by batch workflows to obtain entity IDs for inner transactions after batch execution

**Interface**:

```typescript
interface ReceiptService {
  getReceipt(params: TransactionReceiptParams): Promise<TransactionResult>;
}
```

### 10. KMS Service (Key Management Service)

**Purpose**: Manages operator credentials and cryptographic keys securely.

**Key Features**:

- Dual storage modes: `local` (plain text) and `local_encrypted` (AES-256-GCM encrypted)
- Per-operation key manager override via `--key-manager` flag
- Secure key generation and import
- Private key isolation (keys never exposed outside KMS)
- Transaction signing with key references

## 🔄 Data Flow

### Command Execution Flow

```
1. User Input
   ↓
2. Command Router (identifies plugin and command)
   ↓
3. Plugin Manager (loads command handler)
   ↓
4. Core API Injection (injects services into handler)
   ↓
5. Command Handler Execution
   ↓
6. Service Calls (Account, Signing, State, etc.)
   ↓
7. Response Processing
   ↓
8. Output to User
```

### State Management Flow

```
1. Plugin Request
   ↓
2. State Service
   ↓
3. Namespace Validation
   ↓
4. Schema Validation (if applicable)
   ↓
5. Zustand Store Update
   ↓
6. Persistent Storage (JSON files)
   ↓
7. Response to Plugin
```

## 🏛️ Service Dependencies

```
Core API
├── State Service (Zustand)
├── Network Service
│   └── State Service
├── Config Service
│   └── State Service
├── KMS Service
│   ├── State Service
│   ├── Network Service
│   └── Config Service
├── TxExecutionService
│   ├── KMS Service
│   └── Network Service
├── Receipt Service
│   └── Network Service
├── Account Transaction Service
├── Token Service
├── Topic Service
├── Mirror Node Service
│   └── Network Service
├── Alias Service
│   └── State Service
├── HBAR Service
├── Output Service
└── Logger Service
```

## 🔒 Security Considerations

### 1. Credential Management

- Credentials are stored securely in state using namespaced storage
- Operator credentials are managed per-network through the Network Service
- Keys are stored in the KMS (Key Management Service) with two storage options:
  - **`local`**: Plain text storage (development/testing environments)
  - **`local_encrypted`**: AES-256-GCM encrypted storage (production environments)
- Default key manager configurable via `hcli config set -o default_key_manager -v local|local_encrypted`
- Per-operation override available using `--key-manager` flag on commands that store keys
- No hardcoded credentials in code

### 2. Plugin Isolation

- Plugins cannot access other plugins' state
- Namespace-based isolation

### 3. Network Security

- HTTPS-only communication with Hedera networks
- Proper certificate validation
- Secure key handling

## 📊 Performance Considerations

### 1. Plugin Loading

- All enabled plugins are loaded at CLI startup
- Services are initialized when the Core API is created
- Command handlers are invoked per execution

### 2. State Management

- Zustand provides efficient state updates
- Minimal re-renders and updates
- Persistent storage with JSON files

### 3. Network Optimization

- Efficient Mirror Node API usage
- Proper error handling and retries
- Connection pooling where applicable

## 🧪 Testing Architecture

### 1. Unit Testing

- Each service has comprehensive unit tests
- Mock implementations for external dependencies
- Isolated testing of plugin handlers

### 2. Integration Testing

- End-to-end plugin testing
- Service integration testing
- Network integration testing

### 3. Plugin Testing

- Plugin isolation testing
- State management testing
- Command execution testing

## 🔧 Development Workflow

### 1. Plugin Development

```
1. Create plugin structure
2. Define manifest
3. Implement command handlers
4. Add state schema (if needed)
5. Test plugin
6. Register plugin
```

### 2. Service Development

```
1. Define interface
2. Implement service
3. Add to Core API
4. Update dependency injection
5. Test service
6. Document service
```

### 3. Core API Changes

```
1. Update interfaces
2. Implement changes
3. Update all services
4. Update plugin compatibility
5. Test all plugins
6. Update documentation
```

## 📈 Scalability Considerations

### 1. Plugin System

- Easy to add new plugins
- Plugin isolation prevents conflicts

### 2. Service Architecture

- Service-oriented design
- Clear separation of concerns
- Easy to extend and modify

### 3. State Management

- Namespace isolation
- Schema validation
- Efficient storage and retrieval

## 📚 Related Documentation

- [Plugin Development Guide](../PLUGIN_ARCHITECTURE_GUIDE.md)
- [Core API Reference](./core-api.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Architecture Decision Records](./adr/) - ADRs for interested developers
