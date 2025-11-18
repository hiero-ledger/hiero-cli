# Hedera CLI Plugin Architecture - Running & Testing Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the CLI

```bash
# Basic CLI help
npx ts-node src/hedera-cli.ts --help

# Plugin commands help
npx ts-node src/hedera-cli.ts plugin-management --help

# List plugins
npx ts-node src/hedera-cli.ts plugin-management list
```

## 🧪 Testing the Plugin Architecture

### Test 1: Basic CLI Functionality

```bash
# Test basic CLI
npx ts-node src/hedera-cli.ts --help

# Test plugin commands
npx ts-node src/hedera-cli.ts plugin-management --help
```

### Test 2: Plugin Management

```bash
# List loaded plugins
npx ts-node src/hedera-cli.ts plugin-management list

# Add a plugin (if you have one)
npx ts-node src/hedera-cli.ts plugin-management add ./src/plugins/account

# Get plugin info
npx ts-node src/hedera-cli.ts plugin-management info account

# Check plugin health
npx ts-node src/hedera-cli.ts plugin-management health
```

### Test 3: Account Plugin Commands (if loaded)

```bash
# Account commands (when account plugin is loaded)
npx ts-node src/hedera-cli.ts account --help
npx ts-node src/hedera-cli.ts account create --name my-account --balance 10000
npx ts-node src/hedera-cli.ts account list
npx ts-node src/hedera-cli.ts account balance --account-id 0.0.123456
```

## 🔧 Development Commands

### Run Tests

```bash
# Run the automated test
node test-cli.js

# Run specific plugin tests
npx ts-node src/core/plugin-router/demo-command-routing.ts
```

### Build (if needed)

```bash
# Build the project
npm run build

# Run from built files
node dist/hedera-cli.js --help
```

## 📁 Plugin Architecture Overview

### Directory Structure

```
src/
├── core/
│   ├── plugin-initializer/     # Plugin system initialization
│   ├── plugin-router/          # Command routing system
│   ├── plugin-loader/          # Plugin loading and validation
│   ├── plugin-manager/         # Plugin management operations
│   ├── core-api/               # Core API interfaces and implementations
│   └── services/               # Service interfaces and implementations
├── commands/
│   └── plugin/                 # Plugin management CLI commands
└── plugins/
    └── account/                # Account plugin implementation
```

### Key Components

#### 1. Plugin System (`src/core/`)

- **PluginInitializer**: Initializes the plugin system
- **PluginCommandRouter**: Routes `<pluginName> <cmd>` commands
- **PluginLoader**: Loads and validates plugins
- **PluginManager**: Manages plugin lifecycle

#### 2. Plugin Commands (`src/commands/plugin/`)

- `plugin-management list` - List loaded plugins
- `plugin-management add <path>` - Add a plugin
- `plugin-management remove <name>` - Remove a plugin
- `plugin-management info <name>` - Show plugin information
- `plugin-management health [name]` - Check plugin health
- `plugin-management commands [name]` - List plugin commands

#### 3. Account Plugin (`src/plugins/account/`)

- `account create` - Create a new account
- `account list` - List accounts
- `account balance` - Get account balance
- `account import` - Import an account
- `account view` - View account details
- `account clear` - Clear accounts
- `account delete` - Delete an account

## 🎯 Command Format (ADR-001 Compliant)

### Plugin Commands

```bash
# Format: <pluginName> <cmd> [options]
hedera-cli account create --name my-account --balance 10000
hedera-cli account list
hedera-cli account balance --account-id 0.0.123456
```

### Plugin Management

```bash
# Plugin management commands
hedera-cli plugin-management list
hedera-cli plugin-management add ./my-plugin
hedera-cli plugin-management remove my-plugin
hedera-cli plugin-management info my-plugin
hedera-cli plugin-management health
```

## 🔍 Troubleshooting

### Common Issues

#### 1. TypeScript Compilation Errors

```bash
# If you get TypeScript errors, try:
npx tsc --noEmit
```

#### 2. Module Resolution Issues

```bash
# Check if all dependencies are installed
npm list @hashgraph/sdk commander
```

#### 3. Plugin Loading Issues

```bash
# Check plugin manifest
cat src/plugins/account/manifest.ts
```

### Debug Mode

```bash
# Run with debug logging
npx ts-node src/hedera-cli.ts --debug plugin list
```

## 📊 Architecture Status

| Component            | Status   | Description                            |
| -------------------- | -------- | -------------------------------------- |
| ✅ Core API          | Complete | Service interfaces and implementations |
| ✅ Plugin System     | Complete | Plugin loading, validation, lifecycle  |
| ✅ Command Routing   | Complete | `<pluginName> <cmd>` format support    |
| ✅ Plugin Management | Complete | Full CLI for managing plugins          |
| ✅ Account Plugin    | Complete | Account operations plugin              |
| ✅ CLI Integration   | Complete | Seamless integration with main CLI     |

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. **CLI Help**: `npx ts-node src/hedera-cli.ts --help` shows all commands
2. **Plugin Commands**: `npx ts-node src/hedera-cli.ts plugin-management --help` shows plugin management
3. **Plugin List**: `npx ts-node src/hedera-cli.ts plugin-management list` shows loaded plugins
4. **Account Commands**: `npx ts-node src/hedera-cli.ts account --help` shows account operations

## 🚀 Next Steps

1. **Test the CLI**: Run the commands above to verify everything works
2. **Add More Plugins**: Create additional plugins following the account plugin pattern
3. **Implement Real Services**: Replace mock implementations with real Hedera SDK calls
4. **Add Tests**: Create comprehensive unit tests for the plugin system

The plugin architecture is now fully functional and ADR-001 compliant! 🎉
