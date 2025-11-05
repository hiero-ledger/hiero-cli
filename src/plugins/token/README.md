# Token Plugin

Complete token management plugin for the Hedera CLI following the plugin architecture (ADR-001) and result-oriented command handler contract (ADR-003).

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Namespace Isolation**: Own state namespace (`token-tokens`)
- **Type Safety**: Full TypeScript support
- **ADR-003 Compliance**: All command handlers return `CommandExecutionResult` with structured output

## 📁 Structure

```
src/plugins/token/
├── manifest.ts              # Plugin manifest with command definitions and output specs
├── schema.ts                # Token data schema with Zod validation
├── commands/
│   ├── create/
│   │   ├── handler.ts       # Token creation handler (ADR-003 compliant)
│   │   └── output.ts        # Output schema and template
│   ├── transfer/
│   │   ├── handler.ts       # Token transfer handler (ADR-003 compliant)
│   │   └── output.ts        # Output schema and template
│   ├── associate/
│   │   ├── handler.ts       # Token association handler (ADR-003 compliant)
│   │   └── output.ts        # Output schema and template
│   ├── list/
│   │   ├── handler.ts       # Token list handler (ADR-003 compliant)
│   │   └── output.ts        # Output schema and template
│   └── createFromFile/
│       ├── handler.ts       # Token from file handler (ADR-003 compliant)
│       └── output.ts        # Output schema and template
├── zustand-state-helper.ts  # State management helper
├── __tests__/               # Comprehensive test suite
│   └── unit/
│       ├── adr003-compliance.test.ts  # ADR-003 compliance tests
│       └── [other test files...]
└── index.ts                # Plugin exports
```

## 🚀 Commands

### Token Create

Create a new fungible token with specified properties.

```bash
hedera token create \
  --name "My Token" \
  --symbol "MTK" \
  --treasury 0.0.123456:treasury-key \
  --decimals 2 \
  --initial-supply 1000 \
  --supply-type FINITE \
  --max-supply 10000 \
  --admin-key admin-public-key
```

### Token Associate

Associate a token with an account to enable transfers.

```bash
hedera token associate \
  --token-id 0.0.123456 \
  --account 0.0.789012:account-key
```

### Token Transfer

Transfer a fungible token from one account to another.

```bash
hedera token transfer \
  --token-id 0.0.123456 \
  --from 0.0.111111:from-key \
  --to 0.0.222222 \
  --balance 100
```

### Token Create From File

Create a new token from a JSON file definition with advanced features.

```bash
hedera token create-from-file \
  --file token-definition.json \
  --args additional-args
```

## 📝 Parameter Formats

The plugin supports flexible account parameter formats:

- **Account ID only**: `0.0.123456` (for destination accounts)
- **Account ID with key**: `0.0.123456:private-key` (for source accounts that need signing)
- **Account name**: `alice` (resolved via alias service)

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.tokens` - Token transaction creation and management
- `api.txExecution` - Transaction signing and execution
- `api.kms` - Account credentials and key management
- `api.alias` - Account name resolution
- `api.state` - Namespaced state management
- `api.network` - Network information
- `api.logger` - Logging

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
  keys: TokenKeys;
  network: 'mainnet' | 'testnet' | 'previewnet';
  associations: TokenAssociation[];
  customFees: CustomFee[];
}
```

## 🔄 Migration from Commands

This plugin migrates the following commands from the old architecture:

- `src/commands/token/create.ts` → `src/plugins/token/commands/create.ts`
- `src/commands/token/associate.ts` → `src/plugins/token/commands/associate.ts`
- `src/commands/token/transfer.ts` → `src/plugins/token/commands/transfer.ts`

## 🧪 Testing

The plugin includes comprehensive tests following ADR-003 patterns:

```typescript
import { Status } from '../../../core/shared/constants';

// Example ADR-003 compliant test
describe('Token Plugin ADR-003 Compliance', () => {
  test('token create command returns CommandExecutionResult', async () => {
    const result = await createTokenHandler(mockArgs);

    // Assert structure
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    // Assert output format
    const output = JSON.parse(result.outputJson) as CreateTokenOutput;
    expect(output.tokenId).toBe('0.0.12345');
    expect(output.name).toBe('TestToken');
  });
});
```

### Test Structure

- **ADR-003 Compliance**: `adr003-compliance.test.ts` - Tests all handlers return proper `CommandExecutionResult`
- **Unit Tests**: Individual command handler tests with mocks and fixtures
- **Integration Tests**: End-to-end token lifecycle tests
- **Schema Tests**: Validation of input/output schemas

## 📊 Output Formats

All commands support multiple output formats through ADR-003:

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

## 🔮 Future Enhancements

- ✅ `createFromFile` command (implemented)
- ✅ Token listing with filtering (implemented)
- Implement token balance queries
- Add token update operations
- Support for more custom fee types
- Add token deletion/wipe operations
- Add script mode support (`--script` flag)
- Add output format control (`--format json|yaml|xml`)
- Add output file redirection (`--output file.json`)
