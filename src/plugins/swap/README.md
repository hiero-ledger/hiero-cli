# Swap Plugin

Multi-party asset exchange plugin for the Hiero CLI. Allows building a swap step-by-step (HBAR, fungible tokens, NFTs) and executing all transfers in a single atomic transaction.

## Architecture

- **Stateful**: Swaps are saved locally until executed or deleted
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Structured Output**: All command handlers return `CommandResult` with standardized output
- **Type Safety**: Full TypeScript support with Zod schemas and `SwapTransferType` enum

## Structure

```
src/plugins/swap/
├── manifest.ts              # Plugin manifest with command definitions
├── schema.ts                # Swap state schemas and SwapTransferType enum
├── state-helper.ts          # SwapStateHelper class for swap state management
├── commands/
│   ├── create/              # Create a new named swap
│   ├── add-hbar/            # Add an HBAR transfer to a swap
│   ├── add-ft/              # Add a fungible token transfer to a swap
│   ├── add-nft/             # Add NFT serial transfers to a swap
│   ├── execute/             # Sign and submit the swap transaction
│   ├── list/                # List all saved swaps
│   └── delete/              # Delete a swap without executing it
└── __tests__/unit/
```

## Commands

### Create

Create a new named swap. The swap is saved locally; no network interaction occurs.

```bash
hcli swap create -n my-swap
hcli swap create -n my-swap --memo "Token exchange"
```

**Options:**

- `-n, --name <string>` - Name for the swap (required)
- `-m, --memo <string>` - Optional memo attached to the transaction

### Add HBAR

Add an HBAR transfer step to an existing swap.

```bash
hcli swap add-hbar -n my-swap --to alice --amount 10
hcli swap add-hbar -n my-swap --to 0.0.123456 --amount 1000t --from bob
```

**Options:**

- `-n, --name <string>` - Name of the swap (required)
- `-t, --to <string>` - Destination account (accountId or alias) (required)
- `-a, --amount <string>` - Amount: `"10"` = 10 HBAR, `"1000t"` = 1000 tinybars (required)
- `-f, --from <string>` - Source account (defaults to operator)
- `-k, --key-manager <string>` - Key manager type (defaults to config setting)

### Add FT

Add a fungible token transfer step to an existing swap.

```bash
hcli swap add-ft -n my-swap --to alice --token my-token --amount 100
hcli swap add-ft -n my-swap --to 0.0.123456 --token 0.0.8849743 --amount 50t --from bob
```

**Options:**

- `-n, --name <string>` - Name of the swap (required)
- `-t, --to <string>` - Destination account (required)
- `-T, --token <string>` - Fungible token identifier (token ID or alias) (required)
- `-a, --amount <string>` - Amount in display units (`"10"` = 10 tokens, `"1000t"` = base units) (required)
- `-f, --from <string>` - Source account (defaults to operator)
- `-k, --key-manager <string>` - Key manager type (defaults to config setting)

### Add NFT

Add one or more NFT serial transfers to an existing swap. Each serial counts as one transfer entry towards the 10-entry limit.

```bash
hcli swap add-nft -n my-swap --to alice --token my-nft --serials 1,2,3
hcli swap add-nft -n my-swap --to 0.0.123456 --token 0.0.8849743 --serials 5 --from bob
```

**Options:**

- `-n, --name <string>` - Name of the swap (required)
- `-t, --to <string>` - Destination account (required)
- `-T, --token <string>` - NFT token identifier (token ID or alias) (required)
- `-s, --serials <string>` - Comma-separated serial numbers, e.g. `"1,2,3"` (required)
- `-f, --from <string>` - Source account (defaults to operator)
- `-k, --key-manager <string>` - Key manager type (defaults to config setting)

### Execute

Sign all transfers and submit the swap as a single transaction. The swap is automatically removed from state on success.

```bash
hcli swap execute -n my-swap
```

**Options:**

- `-n, --name <string>` - Name of the swap to execute (required)

### View

Display the full details and all transfers of a single swap.

```bash
hcli swap view -n my-swap
```

**Options:**

- `-n, --name <string>` - Name of the swap to view (required)

### List

Display a summary of all saved swaps.

```bash
hcli swap list
```

### Delete

Remove a swap from state without executing it.

```bash
hcli swap delete -n my-swap
```

**Options:**

- `-n, --name <string>` - Name of the swap to delete (required)

## Workflow Example

```bash
# 1. Create a swap
hcli swap create -n exchange --memo "Alice sends HBAR, Bob sends tokens"

# 2. Add transfers (max 10 total)
hcli swap add-hbar -n exchange --from alice --to bob --amount 100
hcli swap add-ft   -n exchange --from bob --to alice --token my-token --amount 50

# 3. Review before executing
hcli swap view -n exchange

# 4. Execute (signs with all required keys in one transaction)
hcli swap execute -n exchange
```

## Limits

- Maximum 10 transfer entries per swap (Hedera `TransferTransaction` limit)
- Each NFT serial number counts as one entry
- All transfers are submitted in a single transaction — either all succeed or all fail

## State

Swaps are stored per-network in `~/.hiero-cli/state/swap-storage.json`. Each swap is a separate key in the `swap` namespace.

## Core API Integration

- `api.transfer` — builds `TransferTransaction` with all entries
- `api.txSign` — signs with all unique `from` account keys in one call
- `api.txExecute` — submits the transaction
- `api.keyResolver` — resolves account credentials at `add` time
- `api.mirror` — fetches FT decimals at `add-ft` time to convert display amount to base units
- `api.state` — persists swap state between commands
- `api.network` — network information
