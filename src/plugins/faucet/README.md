# Faucet Plugin

A plugin for topping up accounts with HBAR on testnet and previewnet via the Hedera Portal Faucet API.

## 🏗️ Architecture

- **Stateless handler** – no shared globals; all dependencies injected via `CommandHandlerArgs`
- **Manifest-driven** – commands, options, and output schemas declared in `manifest.ts`
- **External HTTP call** – disbursement is handled by the Hedera Portal API, not the Hedera SDK
- **Structured output** – handler returns `CommandResult` with standardized output
- **Alias-aware** – recipient accepts an account alias, Hedera account ID, or EVM address

## 📁 Structure

```
src/plugins/faucet/
├── manifest.ts              # Plugin manifest with command definitions
├── commands/
│   └── request/
│       ├── handler.ts       # Request disbursement handler
│       ├── input.ts         # Input schema (recipient, amount)
│       ├── output.ts        # Output schema & Handlebars template
│       └── index.ts         # Command exports
├── __tests__/unit/          # Unit tests
└── index.ts                 # Plugin exports
```

## 🔑 Setup

The faucet plugin requires a Hedera Portal Personal Access Token (PAT). To obtain one:

1. Create an account at [portal.hedera.com](https://portal.hedera.com)
2. Generate a PAT by following the instructions at:
   https://docs.hedera.com/native/tutorials/getting-started/create-api-key
3. Store the token in the CLI config:

```bash
hcli config set --portal_pat <your-token>
# or short form:
hcli config set -p <your-token>
```

## 🚀 Commands

### Faucet Request

Request HBAR from the faucet and send it to an account on testnet or previewnet.

```bash
# Send 100 HBAR (default) to a Hedera account alias
hcli faucet request --recipient myAccount

# Send 50 HBAR to an explicit account ID
hcli faucet request --recipient 0.0.12345 --amount 50

# Send to an EVM address on previewnet
hcli faucet request --recipient 0xabc...def --amount 10 -N previewnet

# Short form
hcli faucet request -r myAccount -a 50
```

**Options:**

| Option        | Short | Required | Description                                                        |
| ------------- | ----- | -------- | ------------------------------------------------------------------ |
| `--recipient` | `-r`  | **yes**  | Account alias, Hedera account ID (`0.0.x`), or EVM address (`0x…`) |
| `--amount`    | `-a`  | no       | HBAR to request (1–100, default: 100)                              |

**Network:** controlled by the global `-N` flag (`testnet` or `previewnet` only — mainnet and localnet are not supported).

**Rate limits (enforced by the Hedera Portal API):**

- Up to 100 HBAR per call
- Up to 100 HBAR per 24-hour rolling window (shared with the web faucet)
- One disbursement per destination address per 24 hours

**Output:**

```json
{
  "recipient": "0.0.12345",
  "amount": 100,
  "transactionId": "0.0.2@1715600000.123456789",
  "network": "testnet",
  "quotaUsed": 100,
  "quotaRemaining": 0
}
```

Human output:

```
Faucet request successful!

  Amount:         100 HBAR
  Recipient:      0.0.12345
  Network:        testnet
  Transaction ID: https://hashscan.io/testnet/transaction/0.0.2@1715600000.123456789
  Daily quota:    100 HBAR used / 0 HBAR remaining
```

## 🔧 Core API Integration

- `api.config` – reads `portal_pat` to authenticate with the faucet API
- `api.network` – resolves current network; validates testnet/previewnet
- `api.identityResolution` – resolves account aliases and EVM addresses to entity IDs

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm test -- src/plugins/faucet/__tests__/unit
```

Test coverage includes:

- Successful disbursement to account ID and EVM address
- Alias resolution before API call
- Default amount (100 HBAR) when `--amount` is omitted
- Error when PAT is not configured
- Error when network is mainnet or localnet
- Error handling for API responses: 403 (auth), 422 (unfundable), 429 (quota), 5xx (server)
- Input validation: amount below 1 or above 100
