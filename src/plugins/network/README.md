# Network Plugin

Network management plugin for the Hedera CLI.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Structured Output**: All command handlers return `CommandExecutionResult` with standardized output
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/network/
├── manifest.ts              # Plugin manifest with command definitions
├── commands/
│   ├── list/
│   │   ├── handler.ts      # List networks handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── use/
│   │   ├── handler.ts      # Switch network handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── get-operator/
│   │   ├── handler.ts      # Get operator handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   └── set-operator/
│       ├── handler.ts      # Set operator handler
│       ├── output.ts       # Output schema and template
│       └── index.ts        # Command exports
├── utils/
│   └── networkHealth.ts    # Network health check utilities
├── __tests__/unit/         # Unit tests
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output that includes:

- `status`: Success or failure status
- `errorMessage`: Optional error message (present when status is not 'success')
- `outputJson`: JSON string conforming to the output schema defined in `output.ts`

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Network List

List all available networks with their configuration and health status. For each network, it displays:

- Network name and active status
- Operator account ID (if configured for that network)
- Mirror Node URL and RPC URL for the currently active network
- Health check status for both Mirror Node and RPC endpoints (for the active network)

```bash
hcli network list
```

### Network Use

Switch the active network to the specified network name.

```bash
hcli network use --network testnet
hcli network use --network mainnet
hcli network use --network previewnet
hcli network use --network localnet
```

**Options:**

- `-N, --network <string>` - Network name (testnet, mainnet, previewnet, localnet) (required)

### Network Get Operator

Get operator credentials for a specific network.

```bash
# Get operator for current network
hcli network get-operator

# Get operator for specific network
hcli network get-operator --network testnet
```

**Options:**

- `-N, --network <string>` - Target network (defaults to current network) (optional)

### Network Set Operator

Set operator credentials for signing transactions on a specific network.

```bash
# Using account name (if already imported)
hcli network set-operator --operator my-operator --network testnet

# Using account-id:private-key pair
hcli network set-operator --operator 0.0.123456:302e020100300506032b657004220420... --network testnet
```

**Options:**

- `--operator <string>` - Operator credentials: name or account-id:private-key pair (required)
- `-N, --network <string>` - Target network (defaults to current network) (optional)

> **💡 Interactive Setup (Initialization)**: When running the CLI in interactive mode and an operator is not configured, running a command that requires operator credentials will trigger an automatic **operator initialization wizard**. This wizard guides you through:
>
> - Entering your Account ID
> - Entering your Private Key
> - Selecting a Key Manager (Local Encrypted or Local)
> - Configuring ED25519 support
>
> In script mode (non-interactive), if no operator is configured, an error will be thrown instead.

## 📤 Output Formatting

All commands return structured output through the `CommandExecutionResult` interface:

```typescript
interface CommandExecutionResult {
  status: 'success' | 'failure';
  errorMessage?: string; // Present when status !== 'success'
  outputJson?: string; // JSON string conforming to the output schema
}
```

**Output Structure:**

- **Output Schemas**: Each command defines a Zod schema in `output.ts` for type-safe output validation
- **Human Templates**: Handlebars templates provide human-readable output formatting
- **Error Handling**: All errors are returned in the result structure, ensuring consistent error handling
- **Format Selection**: Output format is controlled by the CLI's `--format` option (default: `human`, or `json` for machine-readable output)

The `outputJson` field contains a JSON string that conforms to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.network` - Network configuration and operator management
- `api.kms` - Secure key management for operator credentials
- `api.alias` - Account name resolution
- `api.mirror` - Mirror node health checks
- `api.logger` - Logging

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm test -- src/plugins/network/__tests__/unit
```

Test coverage includes:

- Listing networks with health checks
- Switching networks
- Getting operator credentials
- Setting operator credentials
- Error handling for invalid inputs
