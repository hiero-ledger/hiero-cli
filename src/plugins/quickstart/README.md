# Quickstart Plugin

Rapid developer onboarding and test environment setup for Hedera development.

## Overview

The Quickstart plugin provides commands to quickly set up a development environment, create test accounts, and verify that everything is working correctly. It's designed to reduce friction for new developers getting started with Hedera.

## Commands

### `hiero quickstart init`

Initialize the CLI for testnet development with a single command.

```bash
# Initialize for testnet (default)
hiero quickstart init

# Initialize for previewnet
hiero quickstart init -n previewnet

# Skip connectivity verification
hiero quickstart init --skip-verify
```

**What it does:**
- Switches to the specified network (testnet/previewnet)
- Verifies operator is configured
- Checks network connectivity via Mirror Node
- Reports operator balance

**Options:**
| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--network` | `-n` | `testnet` | Network to initialize |
| `--skip-verify` | `-s` | `false` | Skip connectivity check |

### `hiero quickstart accounts`

Create multiple funded test accounts at once.

```bash
# Create 3 test accounts with 10 HBAR each (default)
hiero quickstart accounts

# Create 5 accounts with custom prefix and balance
hiero quickstart accounts -c 5 -b 20 -p dev

# Create accounts for different use cases
hiero quickstart accounts --count 4 --balance 50 --prefix alice
```

**What it does:**
- Creates specified number of accounts (up to 10)
- Funds each account with specified balance
- Registers accounts with local alias manager
- Reports account IDs and balances

**Options:**
| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--count` | `-c` | `3` | Number of accounts to create |
| `--balance` | `-b` | `10` | HBAR balance per account |
| `--prefix` | `-p` | `test` | Prefix for account names |

### `hiero quickstart verify`

Run diagnostic checks on your development environment.

```bash
# Basic verification
hiero quickstart verify

# Full verification with test transfer
hiero quickstart verify --full
```

**What it does:**
- Checks network configuration
- Verifies operator is configured
- Tests Mirror Node connectivity
- Checks operator balance
- (Full mode) Performs a test transfer to verify signing

**Checks performed:**
1. **Network Configuration** - Validates network selection
2. **Operator Configured** - Confirms operator credentials exist
3. **Mirror Node Connectivity** - Tests API connection
4. **Operator Balance** - Verifies sufficient funds
5. **Transaction Signing** (full mode only) - Test transfer to self

**Options:**
| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--full` | `-f` | `false` | Include test transfer |

## Workflow Examples

### New Developer Setup

```bash
# Step 1: Initialize for testnet
hiero quickstart init

# Step 2: Create some test accounts
hiero quickstart accounts -c 5 -p myapp

# Step 3: Verify everything works
hiero quickstart verify --full
```

### CI/CD Environment Check

```bash
# Quick health check before running tests
hiero quickstart verify

# If verification passes, run your test suite
npm test
```

### Multi-Account Testing Setup

```bash
# Create accounts for different test scenarios
hiero quickstart accounts -c 3 -p sender -b 100
hiero quickstart accounts -c 3 -p receiver -b 1
hiero quickstart accounts -c 2 -p treasury -b 500
```

## Output Formats

All commands support JSON output for scripting:

```bash
# Get machine-readable output
hiero quickstart verify --format json

# Use with jq for specific values
hiero quickstart init --format json | jq '.operatorId'
```

## Error Handling

The plugin provides clear error messages for common issues:

- **No operator configured**: Run `hiero network set-operator` first
- **Insufficient balance**: Add more HBAR from the testnet faucet
- **Network connectivity**: Check your internet connection
- **Invalid network**: Only testnet and previewnet are supported

## Best Practices

1. **Always verify first**: Run `hiero quickstart verify` before starting development
2. **Use meaningful prefixes**: Account prefixes like `alice`, `bob`, `treasury` make testing clearer
3. **Don't over-fund**: Use reasonable test amounts to preserve operator balance
4. **Full verification for CI**: Use `--full` in CI pipelines to catch signing issues early
