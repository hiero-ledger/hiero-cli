# Hiero CLI Technical Documentation

Technical documentation for developers and contributors working on the Hiero CLI project.

## 📚 Documentation Structure

- **[Architecture Overview](./architecture.md)** - System architecture and design principles
- **[Plugin Development Guide](../PLUGIN_ARCHITECTURE_GUIDE.md)** - Complete guide to creating plugins
- **[Core API Reference](./core-api.md)** - Detailed Core API documentation
- **[Output Schemas Guide](./output-schemas-guide.md)** - Output schemas and templates
- **[Contributing Guide](../CONTRIBUTING.md)** - Development setup and contribution guidelines
- **[Architecture Decision Records](./adr/)** - ADRs for interested developers

## 🏗️ Project Structure

```
hiero-cli/
├── src/
│   ├── core/                    # Core API and services
│   │   ├── core-api/            # Main Core API and interface
│   │   ├── commands/            # Base command classes and interfaces
│   │   ├── errors/              # Typed error classes (ValidationError, NotFoundError, etc.)
│   │   ├── hooks/               # Hook system (AbstractHook, PreExecuteTransactionParams, etc.)
│   │   ├── plugins/             # Plugin manager and plugin interfaces
│   │   ├── schemas/             # Shared Zod schemas (common-schemas, etc.)
│   │   ├── services/            # Service implementations
│   │   │   ├── account/         # Account transaction creation
│   │   │   ├── alias/           # Alias resolution and registration
│   │   │   ├── allowance/       # Allowance approve/delete transaction builders
│   │   │   ├── batch/           # Batch transaction service (HIP-551)
│   │   │   ├── config/          # CLI configuration
│   │   │   ├── contract-compiler/    # Solidity compilation
│   │   │   ├── contract-query/      # Contract view calls
│   │   │   ├── contract-transaction/   # Contract transaction building
│   │   │   ├── contract-verifier/   # Contract verification
│   │   │   ├── error-boundary/      # Error handling and output
│   │   │   ├── identity-resolution/ # Identity resolution
│   │   │   ├── key-resolver/    # Key and account credential resolution
│   │   │   ├── kms/             # Key management (local, encrypted)
│   │   │   ├── logger/          # Logging service
│   │   │   ├── mirrornode/      # Hedera Mirror Node API
│   │   │   ├── network/         # Network and operator management
│   │   │   ├── output/          # Output formatting (human, JSON, YAML)
│   │   │   ├── plugin-management/   # Plugin loading and management
│   │   │   ├── process-exit/    # Process exit handling
│   │   │   ├── receipt/         # Transaction receipt retrieval
│   │   │   ├── state/           # Zustand state storage
│   │   │   ├── token/           # Token transaction creation
│   │   │   ├── topic/           # Topic transaction creation
│   │   │   ├── transfer/         # TransferTransaction builders (HBAR, FT, NFT)
│   │   │   ├── tx-execute/      # Transaction execution
│   │   │   └── tx-sign/         # Transaction signing
│   │   ├── shared/              # Shared config, constants, validation
│   │   ├── types/               # Shared types
│   │   └── utils/               # Core utilities (key-composer, receipt-mapper, etc.)
│   ├── plugins/                # Built-in plugins
│   │   ├── account/            # Account management plugin
│   │   ├── batch/              # Batch transaction plugin (create, execute, list, delete)
│   │   ├── config/             # CLI configuration plugin
│   │   ├── contract/           # Smart contract plugin
│   │   ├── contract-erc20/     # ERC-20 contract plugin
│   │   ├── contract-erc721/    # ERC-721 (NFT) contract plugin
│   │   ├── credentials/        # Credentials plugin
│   │   ├── hbar/               # HBAR transfer plugin
│   │   ├── network/            # Network selection and operator management
│   │   ├── plugin-management/  # Plugin management plugin
│   │   ├── token/              # Fungible and non-fungible token management plugin
│   │   ├── topic/              # Topic (HCS) management plugin
│   │   └── test/               # Test plugin (development/testing)
│   └── hiero-cli.ts           # Main CLI entry point
├── docs/                       # Technical documentation
└── coverage/                   # Test coverage reports
```

## 🎯 Key Technical Features

- **🔌 Plugin Architecture**: Extensible plugin system
- **🏦 Real Hedera Integration**: Direct integration with Hedera networks via Mirror Node API
- **💾 State Management**: Persistent state with Zustand, schema validation, and per-plugin JSON files under `.hiero-cli/state/`
- **🔐 Credentials Management**: Secure credential handling via KMS and per-network operators
- **📊 Comprehensive API**: Full Hedera Mirror Node API support with TypeScript types
- **🛡️ Type Safety**: Full TypeScript support throughout the codebase

## 📖 Documentation Index

### Architecture & Design

- [Architecture Overview](./architecture.md) - System design and service architecture
- [Architecture Decision Records](./adr/) - ADRs for interested developers

### Development

- [Plugin Development Guide](../PLUGIN_ARCHITECTURE_GUIDE.md) - Creating and developing plugins
- [Core API Reference](./core-api.md) - Core API services and interfaces
- [Output Schemas Guide](./output-schemas-guide.md) - Output schemas and templates
- [Contributing Guide](../CONTRIBUTING.md) - Development setup and guidelines

## 🔧 Development Workflow

1. **Understanding the Architecture**: Start with [Architecture Overview](./architecture.md)
2. **Plugin Development**: Follow the [Plugin Development Guide](../PLUGIN_ARCHITECTURE_GUIDE.md)
3. **API Reference & Outputs**: Use [Core API Reference](./core-api.md) and [Output Schemas Guide](./output-schemas-guide.md) for implementation details
4. **Contributing**: Check [Contributing Guide](../CONTRIBUTING.md) for development standards

## 📄 License

This project is licensed under the Apache License 2.0. See the [LICENSE](../LICENSE) file for details.
