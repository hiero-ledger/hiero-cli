# Token Plugin

Complete token management plugin for the Hiero CLI following the plugin architecture.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Namespace Isolation**: Own state namespace (`token-tokens`)
- **Type Safety**: Full TypeScript support
- **Structured Output**: All command handlers return `CommandExecutionResult` with standardized output

## 📁 Structure

```
src/plugins/token/
├── manifest.ts              # Plugin manifest with command definitions and output specs
├── schema.ts                # Token data schema with Zod validation
├── commands/
│   ├── create/
│   │   ├── handler.ts       # Fungible token creation handler
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── mint-ft/
│   │   ├── handler.ts       # Fungible token minting handler
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── mint-ft/
│   │   ├── handler.ts       # Fungible token minting handler
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── transfer/
│   │   ├── handler.ts       # Fungible token transfer handler
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── associate/
│   │   ├── handler.ts       # Fungible token association handler
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── list/
│   │   ├── handler.ts       # Fungible token list handler
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts        # Command exports
│   └── createFromFile/
│       ├── handler.ts       # Fungible token from file handler
│       ├── output.ts        # Output schema and template
│       └── index.ts        # Command exports
├── zustand-state-helper.ts  # State management helper
├── resolver-helper.ts       # Token and account resolver utilities
├── __tests__/               # Comprehensive test suite
│   └── unit/
│       ├── adr003-compliance.test.ts  # Output structure compliance tests
│       └── [other test files...]
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output that includes:

- `status`: Success or failure status
- `errorMessage`: Optional error message (present when status is not 'success')
- `outputJson`: JSON string conforming to the output schema defined in `output.ts`

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Token Create (Fungible Token)

Create a new fungible token with specified properties.

```bash
# Using account alias
hcli token create-ft \
  --token-name "My Token" \
  --symbol "MTK" \
  --treasury alice \
  --decimals 2 \
  --initial-supply 1000 \
  --supply-type FINITE \
  --max-supply 10000 \
  --admin-key admin-public-key \
  --name mytoken-alias

# Using treasury-id:treasury-key pair
hcli token create-ft \
  --token-name "My Token" \
  --symbol "MTK" \
  --treasury 0.0.123456:302e020100300506032b657004220420... \
  --decimals 2 \
  --initial-supply 1000 \
  --supply-type INFINITE \
  --name mytoken-alias
```

### Token Mint FT

Mint additional fungible tokens to increase supply. Tokens are minted to the token's treasury account.

```bash
# Using token alias
hcli token mint-ft \
  --token mytoken-alias \
  --amount 1000 \
  --supply-key 0.0.123456:302e020100300506032b657004220420...

# Using token ID with account alias for supply key
hcli token mint-ft \
  --token 0.0.123456 \
  --amount 500t \
  --supply-key supply-account-alias

# Using base units (t suffix)
hcli token mint-ft \
  --token 0.0.123456 \
  --amount 5000t \
  --supply-key 0.0.123456:302e020100300506032b657004220420...
```

**Parameters:**

- `--token` / `-T`: Token identifier (alias or token ID) - **Required**
- `--amount` / `-a`: Amount to mint - **Required**
  - Display units (default): `100` (will be multiplied by token decimals)
  - Base units: `100t` (raw amount without decimals)
- `--supply-key` / `-s`: Supply key for signing - **Required**
  - Account alias: `supply-account-alias`
  - Account with key: `0.0.123456:private-key`
- `--key-manager` / `-k`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

**Note:** The token must have a supply key configured. Minted tokens are added to the token's treasury account.

### Token Associate

Associate a fungible or non-fungible token with an account to enable transfers.

```bash
# Using account alias
hcli token associate-ft \
  --token mytoken-alias \
  --account alice

# Using account-id:account-key pair
hcli token associate-ft \
  --token 0.0.123456 \
  --account 0.0.789012:302e020100300506032b657004220420...
```

### Token Transfer (Fungible Token)

Transfer a fungible token from one account to another.

```bash
# Using account name for source
hcli token transfer-ft \
  --token mytoken-alias \
  --from alice \
  --to bob \
  --amount 100

# Using account-id:private-key pair for source
hcli token transfer-ft \
  --token 0.0.123456 \
  --from 0.0.111111:302e020100300506032b657004220420... \
  --to 0.0.222222 \
  --amount 100t
```

### Token List

List all tokens (FT and NFT) stored in state for all networks.

```bash
hcli token list
hcli token list --keys  # Show token key information
```

### Token Create From File (Fungible Token)

Create a new fungible token from a JSON file definition with advanced features.

```bash
# Basic usage
hcli token create-ft-from-file --file token-definition.json

# With specific key manager
hcli token create-ft-from-file --file token-definition.json --key-manager local_encrypted
```

**Token File Format:**

The token file supports aliases and raw keys with optional key type prefixes:

```json
{
  "name": "my-token",
  "symbol": "MTK",
  "decimals": 8,
  "supplyType": "finite",
  "initialSupply": 1000000,
  "maxSupply": 10000000,
  "treasuryKey": "<alias or accountId:privateKey>",
  "adminKey": "<alias or accountId:privateKey>",
  "supplyKey": "<alias or accountId:privateKey>",
  "wipeKey": "<alias or accountId:privateKey>",
  "kycKey": "<alias or accountId:privateKey>",
  "freezeKey": "<alias or accountId:privateKey>",
  "pauseKey": "<alias or accountId:privateKey>",
  "feeScheduleKey": "<alias or accountId:privateKey>",
  "memo": "Optional token memo",
  "associations": ["<alias or accountId:privateKey>", "..."],
  "customFees": [
    {
      "type": "fixed",
      "amount": 100,
      "unitType": "HBAR",
      "collectorId": "<accountId>",
      "exempt": false
    }
  ]
}
```

**Supported formats for treasury and keys:**

- **Alias**: `"my-account"` - resolved via alias service
- **Account with key**: `"0.0.123456:privateKey"`

**Note**: Token name is automatically registered as an alias after successful creation. Duplicate names are not allowed.

## 📝 Parameter Formats

The plugin supports flexible parameter formats:

- **Token**: Token alias (name) or token ID (`0.0.123456`)
- **Treasury**: Account alias (name) or `treasury-id:treasury-key` pair (e.g., `0.0.123456:302e0201...`)
- **Account ID only**: `0.0.123456` (for destination accounts)
- **Account ID with key**: `0.0.123456:private-key` (for source accounts that need signing)
- **Account name**: `alice` (resolved via alias service)
- **Amount**: Display units (default) or base units with `t` suffix (e.g., `100t`)

### Private Key Format

Private keys can optionally be prefixed with their key type:

- **With prefix**: `ed25519:12345676543212345` or `ecdsa:12345676543212345`
- **Without prefix**: `12345676543212345` (defaults to `ecdsa`)

This applies to:

- Treasury keys in `create-from-file` command
- Association keys in `create-from-file` command
- Account keys in `treasury-id:key` format

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.token` - Token transaction creation and management
- `api.txExecution` - Transaction signing and execution
- `api.kms` - Account credentials and key management
- `api.alias` - Account and token name resolution
- `api.state` - Namespaced state management
- `api.network` - Network information
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

**Output Structure:**

- **Output Schemas**: Each command defines a Zod schema in `output.ts` for type-safe output validation
- **Human Templates**: Handlebars templates provide human-readable output formatting
- **Error Handling**: All errors are returned in the result structure, ensuring consistent error handling

The `outputJson` field contains a JSON string that conforms to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

## 📊 State Management

Token data is stored in the `token-tokens` namespace with the following structure:

```typescript
interface TokenData {
  tokenId: string;
  name: string;
  symbol: string;
  treasuryId: string;
  decimals: number;
  initialSupply: number;
  supplyType: 'FINITE' | 'INFINITE';
  maxSupply: number;
  memo?: string;
  keys: TokenKeys;
  network: 'mainnet' | 'testnet' | 'previewnet' | 'localnet';
  associations: TokenAssociation[];
  customFees: CustomFee[];
}
```

The schema is validated using Zod (`TokenDataSchema`) and stored as JSON Schema in the plugin manifest for runtime validation.

## 🧪 Testing

The plugin includes comprehensive tests for output structure:

```typescript
import { Status } from '../../../core/shared/constants';

// Example test verifying CommandExecutionResult structure
describe('Token Plugin Output Structure', () => {
  test('fungible token create command returns CommandExecutionResult', async () => {
    const result = await createToken(mockArgs);

    // Assert structure
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    // Assert output format
    const output = JSON.parse(result.outputJson) as CreateFungibleTokenOutput;
    expect(output.tokenId).toBe('0.0.12345');
    expect(output.name).toBe('TestToken');
  });
});
```

### Test Structure

- **Output Compliance**: `adr003-compliance.test.ts` - Tests all handlers return proper `CommandExecutionResult`
- **Unit Tests**: Individual command handler tests with mocks and fixtures
- **Integration Tests**: End-to-end token lifecycle tests
- **Schema Tests**: Validation of input/output schemas

## 📊 Output Formats

All commands support multiple output formats:

### Human-Readable (Default)

```
✅ Token created successfully: 0.0.12345
   Name: MyToken (MTK)
   Treasury: 0.0.111
   Decimals: 2
   Initial Supply: 1000000
   Supply Type: INFINITE
   Network: testnet
   Transaction ID: 0.0.123@1700000000.123456789
```

### JSON Output

```json
{
  "tokenId": "0.0.12345",
  "name": "MyToken",
  "symbol": "MTK",
  "treasuryId": "0.0.111",
  "decimals": 2,
  "initialSupply": "1000000",
  "supplyType": "INFINITE",
  "transactionId": "0.0.123@1700000000.123456789",
  "network": "testnet"
}
```

Output format is controlled by the CLI's `--format` option (default: `human`, or `json` for machine-readable output).
