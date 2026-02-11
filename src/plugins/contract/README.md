# Contract Plugin

Smart contract management plugin for the Hiero CLI. Handles compilation, deployment, and verification of Solidity smart contracts on the Hedera network.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest
- **Namespace Isolation**: Own state namespace (`contract-contracts`)
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/contract/
├── manifest.ts              # Plugin manifest with command definitions
├── schema.ts                # Contract data schema with Zod validation
├── commands/
│   ├── create/
│   │   ├── handler.ts      # Contract creation handler
│   │   ├── input.ts        # Input schema and validation
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   └── list/
│       ├── handler.ts      # List contracts handler
│       ├── output.ts       # Output schema and template
│       └── index.ts        # Command exports
├── utils/
│   └── contract-file-helpers.ts  # Contract file reading utilities
├── zustand-state-helper.ts # State management helper
├── __tests__/unit/         # Unit tests
└── index.ts               # Plugin exports
```

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output that includes:

- `status`: Success or failure status
- `errorMessage`: Optional error message (present when status is not 'success')
- `outputJson`: JSON string conforming to the output schema defined in `output.ts`

### Contract Create

Compiles a Solidity file, deploys the contract to Hedera, and verifies it on HashScan (skipped for localnet).

```bash
hcli contract create \
  --name my-contract \
  --file ./contracts/MyContract.sol
```

**Required options:**

| Option | Short | Description                                  |
| ------ | ----- | -------------------------------------------- |
| `name` | `n`   | Smart contract name/alias in the state       |
| `file` | `f`   | Path to Solidity file (absolute or relative) |

**Optional options:**

| Option                  | Short | Description                           | Default           |
| ----------------------- | ----- | ------------------------------------- | ----------------- |
| `base-path`             | `b`   | Base path for contract imports        | Current directory |
| `gas`                   | `g`   | Gas for contract creation             | 1000000           |
| `admin-key`             | `a`   | Admin key for the contract            | -                 |
| `memo`                  | `m`   | Contract memo (max 100 chars)         | -                 |
| `solidity-version`      | `v`   | Solidity compiler version             | -                 |
| `constructor-parameter` | `c`   | Repeatable constructor arguments      | -                 |
| `key-manager`           | `k`   | Key manager: local or local_encrypted | Config setting    |

**Example with constructor parameters:**

```bash
hcli contract create \
  --name token-contract \
  --file ./Token.sol \
  --base-path ./contracts \
  --constructor-parameter "MyToken" \
  --constructor-parameter "MTK" \
  --admin-key operator-name
```

### Contract List

Lists all deployed contracts stored in the state across all networks.

```bash
hcli contract list
```

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.contract` - Contract deployment transaction creation
- `api.contractCompiler` - Solidity compilation
- `api.contractVerifier` - HashScan verification
- `api.txExecution` - Transaction signing and execution
- `api.state` - Namespaced state management
- `api.network` - Network information
- `api.alias` - Name registration and resolution
- `api.config` - Configuration (key manager default)
- `api.keyResolver` - Key resolution for admin key
- `api.logger` - Logging

## 📤 Output Formatting

All commands return structured output through the `CommandExecutionResult` interface:

```typescript
interface CommandExecutionResult {
  status: 'success' | 'failure';
  errorMessage?: string; // Present when status !== 'success'
  outputJson?: string; // JSON string conforming to the output schema
}
```

**Output schemas:**

- **Create**: `contractId`, `contractName`, `contractEvmAddress`, `alias`, `network`, `transactionId`, `adminPublicKey`
- **List**: `contracts` (array with `contractId`, `contractName`, `contractEvmAddress`, `alias`, `adminPublicKey`, `network`), `totalCount`

Human-readable output uses Handlebars templates with HashScan links for contract and transaction IDs.

## 📊 State Management

Contract data is stored in the `contract-contracts` namespace with the following structure:

```typescript
interface ContractData {
  contractId: string; // Hedera contract ID (0.0.xxxxx)
  contractName: string; // Contract name from Solidity source
  contractEvmAddress: string; // Deployed EVM address
  adminPublicKey?: string; // Optional admin public key
  network: 'mainnet' | 'testnet' | 'previewnet' | 'localnet';
  memo?: string; // Optional memo (max 100 chars)
}
```

Aliases are registered in the alias service with type `contract` for name resolution.

## ✅ Contract Verification

- **mainnet, testnet, previewnet**: Contracts are automatically verified on HashScan after deployment
- **localnet**: Verification is skipped (not supported)

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm run test:unit -- src/plugins/contract/__tests__/unit
```
