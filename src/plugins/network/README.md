# Network Plugin

Network management plugin for the Hedera CLI.

## 🏗️ Architecture

This plugin follows the same architecture conventions as other CLI plugins:

- **Stateless**: The command handlers are functionally stateless
- **Dependency Injection**: Core services are injected via handler args
- **Manifest-Driven**: Commands and capabilities declared in `manifest.ts`
- **Type Safety**: Strong typing across handlers and output schemas
- **Separation of Concerns**: Handlers compute results; CLI handles formatting/output

## 📁 Structure

```
src/plugins/network/
├── manifest.ts
├── commands/
│   ├── list/
│   │   ├── handler.ts
│   │   ├── index.ts
│   │   └── output.ts
│   └── use/
│       ├── handler.ts
│       ├── index.ts
│       └── output.ts
├── utils/
│   └── networkHealth.ts
├── __tests__/unit/
│   ├── list.test.ts
│   └── use.test.ts
└── index.ts
```

## 🚀 Commands

### Network List

List all available networks, indicate the active one, show operator info and (for the active network) health checks.

```bash
hcli network list
hcli network list --format json
hcli network list --format json --output networks.json
```

### Network Use

Switch the active network.

```bash
hcli network use --network testnet
```

## 🔧 Core API Integration

This plugin uses the following Core API services:

- `api.network` – read available networks, switch active network, read configs/operators
- `api.logger` – optional progress/verbose logs

## 🧪 Testing

Unit tests are located in `__tests__/unit/`:

```bash
npm test -- src/plugins/network/__tests__/unit
```
