# Architecture Overview

This document provides a comprehensive overview of the Hedera CLI architecture, focusing on the plugin system, core services, and how everything works together.

## 🏗️ High-Level Architecture

The Hedera CLI is built on a plugin-based architecture that follows the ADR-001 specification. The system is designed to be extensible, maintainable, and secure.

```
┌─────────────────────────────────────────────────────────────┐
│                    Hedera CLI Architecture                  │
├─────────────────────────────────────────────────────────────┤
│  CLI Entry Point (hedera-cli.ts)                           │
│  ├── Plugin Manager                                        │
│  ├── Core API                                              │
│  └── Command Router                                        │
├─────────────────────────────────────────────────────────────┤
│  Core Services Layer                                       │
│  ├── Account Transaction Service                           │
│  ├── TxExecutionService                                   │
│  ├── State Service (Zustand)                               │
│  ├── Mirror Node Service                                   │
│  ├── Network Service                                       │
│  ├── Config Service                                        │
│  ├── Logger Service                                        │
│  └── Credentials Service                                   │
├─────────────────────────────────────────────────────────────┤
│  Plugin Layer                                              │
│  ├── Account Plugin                                        │
│  ├── Credentials Plugin                                    │
│  ├── Plugin Management Plugin                              │
│  ├── State Management Plugin                               │
│  └── [Custom Plugins]                                      │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 Plugin Architecture

### Core Principles

The plugin architecture is based on ADR-001 and follows these key principles:

1. **Stateless Plugins**: Plugins are functionally stateless
2. **Dependency Injection**: Services are injected into command handlers
3. **Manifest-Driven**: Plugins declare their capabilities via manifests
4. **Namespace Isolation**: Each plugin has its own state namespace
5. **Type Safety**: Full TypeScript support throughout

### Plugin Lifecycle

```
Plugin Discovery → Validation → Loading → Initialization → Command Registration
                                                                    ↓
Command Execution ← Command Routing ← User Input ← CLI Interface
```

### Plugin Structure

```
plugin/
├── manifest.ts              # Plugin manifest
├── commands/                # Command handlers
│   ├── create.ts
│   ├── list.ts
│   └── ...
├── schema.ts                # State schema (optional)
└── index.ts                 # Plugin entry point
```

## 🛠️ Core Services

### 1. Account Transaction Service

**Purpose**: Handles Hedera account creation and management operations.

**Key Features**:

- Account creation with custom parameters
- Key generation and management
- Transaction building and validation

**Interface**:

```typescript
interface AccountTransactionService {
  createAccount(params: CreateAccountParams): Promise<AccountCreationResult>;
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

**Purpose**: Provides read-only access to CLI configuration.

**Key Features**:

- Configuration validation
- Environment variable support
- Profile management

### 7. Logger Service

**Purpose**: Provides structured logging capabilities.

**Key Features**:

- Multiple log levels
- Structured output
- Plugin-specific logging

### 8. Credentials Service

**Purpose**: Manages operator credentials securely.

**Key Features**:

- Credential storage and retrieval
- Environment variable fallback
- Secure key management

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
├── Account Transaction Service
├── TxExecutionService
│   └── Credentials Service
├── State Service (Zustand)
├── Mirror Node Service
│   └── Network Service
├── Network Service
├── Config Service
└── Logger Service
```

## 🔒 Security Considerations

### 1. Credential Management

- Credentials are stored securely in state
- Environment variable fallback for CI/CD
- No hardcoded credentials in code

### 2. Plugin Isolation

- Plugins cannot access other plugins' state
- Namespace-based isolation
- Capability-based access control

### 3. Network Security

- HTTPS-only communication with Hedera networks
- Proper certificate validation
- Secure key handling

## 📊 Performance Considerations

### 1. Lazy Loading

- Plugins are loaded on-demand
- Services are initialized only when needed
- Command handlers are loaded per execution

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
- Capability-based access control

### 2. Service Architecture

- Service-oriented design
- Clear separation of concerns
- Easy to extend and modify

### 3. State Management

- Namespace isolation
- Schema validation
- Efficient storage and retrieval

## 🎯 Future Enhancements

### 1. Plugin Marketplace

- Plugin discovery and installation
- Version management
- Dependency resolution

### 2. Enhanced Security

- Plugin sandboxing
- Capability restrictions
- Audit logging

### 3. Performance Improvements

- Plugin hot-reloading
- Service caching
- Network optimization

## 📚 Related Documentation

- [Plugin Development Guide](./plugin-development.md)
- [Core API Reference](./core-api.md)
- [Contributing Guide](./contributing.md)
- [ADR-001 Plugin Architecture](./adr/ADR-001-plugin-architecture.md)
