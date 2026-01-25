# Vanity Address Generator Plugin

Generate ECDSA accounts whose EVM addresses start with a specific hex prefix.

## Overview

This plugin allows developers to generate "vanity" wallet addresses - addresses that start with memorable or branded hex patterns like `0xdead...`, `0xcafe...`, or `0x1234...`.

Since Hedera ECDSA accounts derive their EVM-compatible address from the public key (via keccak256 hashing), we can generate many key pairs until we find one whose derived address matches the desired prefix.

## Commands

### `hiero vanity generate`

Generate a key pair whose EVM address starts with a specified prefix.

**Options:**

| Option           | Short | Required | Default   | Description                                         |
| ---------------- | ----- | -------- | --------- | --------------------------------------------------- |
| `--prefix`       | `-p`  | Yes      | -         | Hex prefix to match (1-8 chars, with or without 0x) |
| `--max-attempts` | `-m`  | No       | 1,000,000 | Maximum generation attempts                         |
| `--timeout`      | `-t`  | No       | 60        | Timeout in seconds                                  |
| `--name`         | `-n`  | No       | -         | Optional name/alias for the key                     |

**Examples:**

```bash
# Find an address starting with 0xdead
hiero vanity generate -p dead

# Find an address starting with 0x1234 with 5M attempts
hiero vanity generate -p 1234 -m 5000000

# Find an address starting with 0xa, timeout after 30s
hiero vanity generate -p a -t 30

# Name the generated key
hiero vanity generate -p cafe -n my-vanity-key
```

**Output:**

```
✅ Vanity address found!
   EVM Address: 0xdead47b2e19f5c3a8b6d2e1a7f4c8b9d0e2f1a3b
   Public Key: 02abc123...
   Matched Prefix: 0xdead
   Attempts: 48293
   Time: 12.5s
   Key Reference: vanity-1706234567890
```

## How It Works

1. Generate random ECDSA key pairs using the Hedera SDK
2. Derive the EVM address: `keccak256(publicKey)[-20:]`
3. Check if the address starts with the target prefix
4. Repeat until match or timeout/max attempts reached
5. Import the matching private key into the KMS

## Probability & Time Estimates

The probability of finding a match depends on prefix length:

| Prefix Length | Expected Attempts | Approx Time (100k/s) |
| ------------- | ----------------- | -------------------- |
| 1 char        | ~16               | Instant              |
| 2 chars       | ~256              | Instant              |
| 3 chars       | ~4,096            | <1 second            |
| 4 chars       | ~65,536           | <1 second            |
| 5 chars       | ~1,048,576        | ~10 seconds          |
| 6 chars       | ~16,777,216       | ~3 minutes           |
| 7 chars       | ~268,435,456      | ~45 minutes          |
| 8 chars       | ~4,294,967,296    | ~12 hours            |

**Note:** Times are approximate and depend on system performance.

## Security Notes

- The generated private key is securely stored in the local KMS
- Private keys are never exposed in command output
- Only the public key and derived address are displayed

## Use Cases

- **Branded wallets**: Create addresses that start with your project name/initials
- **Memorable addresses**: Easier to verify addresses visually (e.g., `0xaaa...`)
- **Testing**: Create distinct test accounts with recognizable prefixes
- **Fun**: Generate addresses with patterns like `0xdead...`, `0xcafe...`, `0xbeef...`

## Related Commands

After generating a vanity key, you can use it with:

- `hiero account create` - Create an account using the generated key
- `hiero kms list` - View stored keys including vanity-generated ones
