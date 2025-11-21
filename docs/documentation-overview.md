# Hedera CLI Technical Documentation

Technical documentation for developers and contributors working on the Hedera CLI project.

## 📚 Documentation Structure

- **[Architecture Overview](./architecture.md)** - System architecture and design principles
- **[Plugin Development Guide](../PLUGIN_ARCHITECTURE_GUIDE.md)** - Complete guide to creating plugins
- **[Core API Reference](./core-api.md)** - Detailed Core API documentation
- **[Output Schemas Guide](./output-schemas-guide.md)** - Output schemas and templates
- **[Contributing Guide](../CONTRIBUTING.md)** - Development setup and contribution guidelines
- **[Architecture Decision Records](./adr/)** - ADRs for interested developers

## 🏗️ Project Structure

```
hedera-cli/
├── src/
│   ├── core/                    # Core API and services
│   │   ├── core-api/           # Main Core API
│   │   ├── services/           # Service implementations
│   │   ├── plugins/            # Plugin system
│   │   └── types/              # Shared types
│   ├── plugins/                # Built-in plugins
│   │   ├── account/            # Account management plugin
│   │   ├── token/              # Token management plugin
│   │   ├── network/            # Network selection and operator management
│   │   ├── hbar/               # HBAR transfer plugin
│   │   ├── credentials/        # Credentials plugin
│   │   ├── plugin-management/  # Plugin management plugin
│   │   ├── state-management/   # State management plugin
│   │   └── topic/              # Topic management plugin
│   └── hedera-cli.ts           # Main CLI entry point
├── docs/                       # Technical documentation
└── coverage/                   # Test coverage reports
```

## 🎯 Key Technical Features

- **🔌 Plugin Architecture**: Extensible plugin system
- **🏦 Real Hedera Integration**: Direct integration with Hedera networks via Mirror Node API
- **💾 State Management**: Persistent state with Zustand, schema validation, and per-plugin JSON files under `.hedera-cli/state/`
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
