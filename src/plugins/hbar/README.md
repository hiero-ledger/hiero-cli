# HBAR Plugin

Complete HBAR transfer management plugin for the Hedera CLI following the plugin architecture (ADR-001).

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest
- **SDK Isolation**: All Hedera SDK code in Core API
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/hbar/
├── manifest.ts              # Plugin manifest with command definitions
├── commands/
│   └── transfer.ts         # HBAR transfer handler
├── __tests__/unit/
│   └── transfer.test.ts    # Unit tests
└── index.ts                # Plugin exports
```

## 🚀 Commands

### HBAR Transfer

Transfer HBAR (tinybars) between accounts with support for names and account IDs.

```bash
# Using short flags
hcli hbar transfer -a 100000000 -f sender -t receiver -m "Payment"

# Using long flags
hcli hbar transfer \
  --amount 100000000 \
  --from myaccount \
  --to 0.0.123456 \
  --memo "Test transfer"

# Using default operator (from env) as sender
hcli hbar transfer -a 50000000 -t receiver
```

**Options:**

- `-a, --amount <number>` - Amount in tinybars (required)
- `-t, --to <string>` - Recipient account (required)
- `-f, --from <string>` - Sender account (optional, defaults to operator from env)
- `-m, --memo <string>` - Transfer memo (optional)

**Examples:**

```bash
# Transfer using names
hcli hbar transfer -a 1000000 -f alice -t bob

# Transfer using account IDs
hcli hbar transfer -a 5000000 -f 0.0.123456 -t 0.0.789012

# Transfer from operator account
hcli hbar transfer -a 100000 -t myaccount
```

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.hbar` - HBAR transfer operations
- `api.txExecution` - Transaction signing and execution
- `api.kms` - Secure key management
- `api.alias` - Name resolution
- `api.state` - Account lookup in state
- `api.network` - Network information
- `api.logger` - Logging

## 🔐 Signing Flow

The plugin intelligently determines which key to use for signing:

1. **Name with keyRefId** - Uses registered key for the name
2. **Account in state** - Looks up account by ID or name, uses its keyRefId
3. **Default operator** - Falls back to operator credentials from env

This ensures transfers are signed with the correct key for the sender account.

## 🔄 Migration from Commands

This plugin migrates the HBAR transfer command from the old architecture:

- `src/commands/hbar.ts` → `src/plugins/hbar/commands/transfer.ts`
- `src/utils/hbar.ts` (SDK code) → `src/core/services/hbar/hbar-service.ts`

All Hedera SDK-related code has been moved to the Core API `HbarService`.

## 🧪 Testing

Unit tests located in `__tests__/unit/transfer.test.ts`:

```bash
npm test -- src/plugins/hbar/__tests__/unit
```

Test coverage (71%):

- HBAR transfer success (all params provided)
- Balance validation (NaN, negative, zero)
- Missing from/to accounts
- Transfer to same account
- Transfer failures
- Default credentials fallback

## 🎯 Key Features

- **Multi-format support**: Accepts names or raw account IDs
- **Smart key resolution**: Automatically finds correct signing key
- **Default operator fallback**: Uses env credentials when sender not specified
- **Name integration**: Works seamlessly with new name system
- **Secure signing**: Leverages `keyRefId` system for key management

## 📝 Technical Details

### Account Resolution Priority

When resolving `--from` or `--to`:

1. Try name lookup via `api.alias.resolve()`
2. Try account name in `account-accounts` state
3. Try account ID in `account-accounts` state
4. Use as raw account ID (operator will sign)

### Signing Logic

```typescript
if (fromKeyRefId) {
  // Use specific key for sender account
  await api.txExecution.signAndExecuteWith(tx, { keyRefId: fromKeyRefId });
} else {
  // Use default operator key
  await api.txExecution.signAndExecute(tx);
}
```
