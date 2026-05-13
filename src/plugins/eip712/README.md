# EIP-712 Plugin

Sign and verify EIP-712 structured typed data using ECDSA or Ed25519 keys managed by the CLI KMS. Useful for DeFi permit flows, off-chain authorizations, meta-transactions, and any dApp integration running on Hedera that requires typed data signatures.

## Architecture

- **Stateless**: No local state — hash, sign, and verify are pure operations
- **Dependency Injection**: Key resolution and identity services injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Structured Output**: All command handlers return `CommandResult` with standardized output
- **Type Safety**: Full TypeScript support with Zod schemas

## Structure

```
src/plugins/eip712/
├── manifest.ts              # Plugin manifest with command definitions
├── index.ts                 # Public exports
├── commands/
│   ├── hash/
│   │   ├── handler.ts       # Eip712HashCommand + eip712Hash()
│   │   ├── index.ts
│   │   ├── input.ts         # Zod schema: domain, types, message
│   │   └── output.ts        # Zod schema + human template
│   ├── sign-ecdsa/
│   │   ├── handler.ts       # Eip712SignEcdsaCommand + eip712SignEcdsa()
│   │   ├── index.ts
│   │   ├── input.ts         # Zod schema: key, keyManager, hash | (domain, types, message)
│   │   └── output.ts        # Zod schema + human template
│   ├── sign-ed25519/
│   │   ├── handler.ts       # Ed25519SignCommand + ed25519Sign()
│   │   ├── index.ts
│   │   ├── input.ts         # Zod schema: key, keyManager, hash | (domain, types, message)
│   │   └── output.ts        # Zod schema + human template
│   ├── verify-ecdsa/
│   │   ├── handler.ts       # Eip712VerifyEcdsaCommand + eip712VerifyEcdsa()
│   │   ├── index.ts
│   │   ├── input.ts         # Zod schema: hash | (domain, types, message), signature, expectedSigner
│   │   └── output.ts        # Zod schema + human template
│   └── verify-ed25519/
│       ├── handler.ts       # Ed25519VerifyCommand + ed25519Verify()
│       ├── index.ts
│       ├── input.ts         # Zod schema: key, keyManager, hash | (domain, types, message), signature
│       └── output.ts        # Zod schema + human template
└── __tests__/unit/
    ├── hash.test.ts
    ├── sign-ecdsa.test.ts
    ├── sign-ed25519.test.ts
    ├── verify-ecdsa.test.ts
    ├── verify-ed25519.test.ts
    └── helpers/
        ├── fixtures.ts
        └── mocks.ts
```

## Commands

### Hash

Compute the EIP-712 digest (keccak256 hash) for a typed data payload without signing it.

```bash
hcli eip712 hash \
  --domain '{"name":"MyApp","version":"1","chainId":295}' \
  --types '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}' \
  --message '{"from":"0xAb...","contents":"Hello"}'

# From JSON files
hcli eip712 hash \
  --domain ./domain.json \
  --types ./types.json \
  --message ./message.json
```

**Options:**

- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file (required)
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file (required)
- `-m, --message <string>` - Message object as inline JSON or path to a JSON file (required)

**Output:**

```
EIP-712 Hash
─────────────────────────────────────────────────
Hash:  0x<keccak256>
```

JSON output fields: `hash`

### Sign (ECDSA)

Sign an EIP-712 typed data payload using an ECDSA key from the KMS. Accepts either a pre-computed hash or the full domain+types+message.

```bash
# From typed data
hcli eip712 sign-ecdsa \
  --key my-ecdsa-key \
  --domain '{"name":"MyApp","version":"1","chainId":295}' \
  --types '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}' \
  --message '{"from":"0xAb...","contents":"Hello"}'

# From pre-computed hash
hcli eip712 sign-ecdsa \
  --key my-ecdsa-key \
  --hash 0x<64-byte-keccak256-hex>

# Domain, types and message from JSON files
hcli eip712 sign-ecdsa \
  --key my-ecdsa-key \
  --domain ./domain.json \
  --types ./types.json \
  --message ./message.json
```

**Options:**

- `-K, --key <string>` - Signing key (defaults to operator). Accepts `accountId:privateKey`, `ecdsa:private:{hex}`, key reference (`kr_xxx`), or account alias
- `-k, --key-manager <string>` - Key manager: `local` or `local_encrypted` (defaults to config setting)
- `-H, --hash <string>` - Pre-computed EIP-712 digest (0x-prefixed hex). Mutually exclusive with `--domain`/`--types`/`--message`
- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file
- `-m, --message <string>` - Message object as inline JSON or path to a JSON file

Provide either `--hash` OR all three of `--domain`, `--types`, `--message` — not both.

**Output:**

```
EIP-712 Signature
─────────────────────────────────────────────────
Signer (EVM):  0xAbCd...1234
Hash:          0x<keccak256>
Signature:     0x<r><s><v>
  r:           0x...
  s:           0x...
  v:           27
```

JSON output fields: `signerEvm`, `signature`, `hash`, `r`, `s`, `v`

### Sign (Ed25519)

Sign an EIP-712 typed data digest using an Ed25519 key from the KMS. Accepts either a pre-computed hash or the full domain+types+message.

```bash
# From typed data
hcli eip712 sign-ed25519 \
  --key my-ed25519-key \
  --domain ./domain.json \
  --types ./types.json \
  --message ./message.json

# From pre-computed hash
hcli eip712 sign-ed25519 \
  --key my-ed25519-key \
  --hash 0x<64-byte-keccak256-hex>
```

**Options:**

- `-K, --key <string>` - Signing key (defaults to operator). Accepts `accountId:privateKey`, `ed25519:private:{hex}`, key reference (`kr_xxx`), or account alias
- `-k, --key-manager <string>` - Key manager: `local` or `local_encrypted` (defaults to config setting)
- `-H, --hash <string>` - Pre-computed EIP-712 digest (0x-prefixed hex). Mutually exclusive with `--domain`/`--types`/`--message`
- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file
- `-m, --message <string>` - Message object as inline JSON or path to a JSON file

Provide either `--hash` OR all three of `--domain`, `--types`, `--message` — not both.

**Output:**

```
EIP-712 / ED25519 Signature
─────────────────────────────────────────────────
Signer key:  0x<ed25519-public-key-hex>
Hash:        0x<keccak256>
Signature:   0x<64-byte-ed25519-sig>
```

JSON output fields: `signerPublicKey`, `hash`, `signature`

### Verify (ECDSA)

Recover the EVM signer address from an EIP-712 signature and optionally assert it matches an expected signer. Accepts either a pre-computed hash or domain+types+message.

```bash
# From typed data
hcli eip712 verify-ecdsa \
  --domain '{"name":"MyApp","version":"1","chainId":295}' \
  --types '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}' \
  --message '{"from":"0xAb...","contents":"Hello"}' \
  --signature 0x<65-byte-hex>

# From pre-computed hash
hcli eip712 verify-ecdsa \
  --hash 0x<keccak256> \
  --signature 0x<65-byte-hex>

# With expected signer assertion (accepts EVM address, account ID, or alias)
hcli eip712 verify-ecdsa \
  --domain ./domain.json --types ./types.json --message ./message.json \
  --signature 0x... \
  --expected-signer 0xAbCd...1234

hcli eip712 verify-ecdsa ... --expected-signer 0.0.12345
hcli eip712 verify-ecdsa ... --expected-signer my-account-alias
```

**Options:**

- `-H, --hash <string>` - Pre-computed EIP-712 digest (0x-prefixed hex). Mutually exclusive with `--domain`/`--types`/`--message`
- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file
- `-m, --message <string>` - Signed message object as inline JSON or path to a JSON file
- `-s, --signature <string>` - EIP-712 signature to verify — 0x-prefixed 65-byte hex (required)
- `-e, --expected-signer <string>` - Account to assert against the recovered signer. Accepts EVM address (`0x...`), Hedera account ID (`0.0.xxx`), or account alias

**Output:**

```
EIP-712 Verification
─────────────────────────────────────────────────
Recovered Signer:  0xAbCd...1234
Match:             ✓ yes
```

JSON output fields: `recoveredSigner`, `match?` (only present when `--expected-signer` is used)

### Verify (Ed25519)

Verify an Ed25519 signature over an EIP-712 digest using a public key from the KMS. Accepts either a pre-computed hash or domain+types+message.

```bash
# From typed data
hcli eip712 verify-ed25519 \
  --key my-ed25519-key \
  --domain ./domain.json \
  --types ./types.json \
  --message ./message.json \
  --signature 0x<64-byte-ed25519-sig>

# From pre-computed hash
hcli eip712 verify-ed25519 \
  --key my-ed25519-key \
  --hash 0x<keccak256> \
  --signature 0x<64-byte-ed25519-sig>
```

**Options:**

- `-K, --key <string>` - Public key to verify against. Accepts key reference, account alias, or account ID
- `-k, --key-manager <string>` - Key manager: `local` or `local_encrypted` (defaults to config setting)
- `-H, --hash <string>` - Pre-computed EIP-712 digest (0x-prefixed hex). Mutually exclusive with `--domain`/`--types`/`--message`
- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file
- `-m, --message <string>` - Signed message object as inline JSON or path to a JSON file
- `-s, --signature <string>` - Signature to verify — 0x-prefixed 64-byte hex (required)

**Output:**

```
EIP-712 / ED25519 Verification
─────────────────────────────────────────────────
Signer key:  <ed25519-public-key-hex>
Hash:        0x<keccak256>
Verified:    true
```

JSON output fields: `signerPublicKey`, `hash`, `verified`

## Workflow Example

```bash
# 1. Compute the digest
hcli eip712 hash \
  --domain ./permit-domain.json \
  --types ./permit-types.json \
  --message ./permit-message.json

# 2a. Sign with ECDSA (using the pre-computed hash)
hcli eip712 sign-ecdsa \
  --key alice \
  --hash 0x<hash-from-step-1>

# 2b. Or sign with Ed25519
hcli eip712 sign-ed25519 \
  --key alice-ed25519 \
  --hash 0x<hash-from-step-1>

# 3a. Verify ECDSA signature
hcli eip712 verify-ecdsa \
  --hash 0x<hash-from-step-1> \
  --signature 0x<ecdsa-signature> \
  --expected-signer alice

# 3b. Verify Ed25519 signature
hcli eip712 verify-ed25519 \
  --key alice-ed25519 \
  --hash 0x<hash-from-step-1> \
  --signature 0x<ed25519-signature>
```

## Notes

- For ECDSA commands: only **ECDSA secp256k1** keys are supported. Passing an Ed25519 key throws a `ValidationError`.
- For Ed25519 commands: only **Ed25519** keys are supported. Passing an ECDSA key throws a `ValidationError`.
- The `--primary-type` is inferred automatically by ethers.js from the provided types definition.
- Domain, types, and message accept either inline JSON strings or paths to JSON files.
- The plugin is stateless — no state is written to `~/.hiero-cli/state/`.
- `--hash` and `--domain`/`--types`/`--message` are mutually exclusive. When using typed data all three fields are required.

## Core API Integration

- `api.keyResolver` — resolves `--key` to a signing/verification credential
- `api.kms` — retrieves the key record and signer handle
- `api.kms.getSignerHandle(keyRefId).signHashWithEcdsaKey(hash)` — raw ECDSA signing over the digest
- `api.kms.getSignerHandle(keyRefId).sign(digestBytes)` — raw Ed25519 signing over the digest
- `api.identityResolution` — resolves `--expected-signer` to an EVM address (for Hedera account IDs and aliases)
- `api.network` — provides current network for identity resolution
