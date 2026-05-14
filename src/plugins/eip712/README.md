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
│   ├── sign/
│   │   ├── handler.ts       # Eip712SignCommand + eip712Sign()
│   │   ├── index.ts
│   │   ├── input.ts         # Zod schema: key, keyManager, hash | (domain, types, message)
│   │   └── output.ts        # Zod schema + human template
│   └── verify/
│       ├── handler.ts       # Eip712VerifyCommand + eip712Verify()
│       ├── index.ts
│       ├── input.ts         # Zod schema: key?, keyManager?, hash | (domain, types, message), signature, expectedSigner?
│       ├── output.ts        # Zod schema + human template
│       └── types.ts         # ExpectedSignerType interface
└── __tests__/unit/
    ├── hash.test.ts
    ├── sign.test.ts
    ├── verify.test.ts
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

### Sign

Sign an EIP-712 typed data payload using a KMS-managed key. The algorithm (**ECDSA** or **Ed25519**) is auto-detected from the key type stored in the KMS.

```bash
# ECDSA key — from typed data
hcli eip712 sign \
  --key my-ecdsa-key \
  --domain '{"name":"MyApp","version":"1","chainId":295}' \
  --types '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}' \
  --message '{"from":"0xAb...","contents":"Hello"}'

# Ed25519 key — from pre-computed hash
hcli eip712 sign \
  --key my-ed25519-key \
  --hash 0x<64-byte-keccak256-hex>

# From JSON files
hcli eip712 sign \
  --key my-key \
  --domain ./domain.json \
  --types ./types.json \
  --message ./message.json
```

**Options:**

- `-K, --key <string>` - Signing key (defaults to operator). Accepts `accountId:privateKey`, `ecdsa:private:{hex}`, `ed25519:private:{hex}`, key reference (`kr_xxx`), or account alias
- `-k, --key-manager <string>` - Key manager: `local` or `local_encrypted` (defaults to config setting)
- `-H, --hash <string>` - Pre-computed EIP-712 digest (0x-prefixed hex). Mutually exclusive with `--domain`/`--types`/`--message`
- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file
- `-m, --message <string>` - Message object as inline JSON or path to a JSON file

Provide either `--hash` OR all three of `--domain`, `--types`, `--message` — not both.

**Output (ECDSA key):**

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

**Output (Ed25519 key):**

```
EIP-712 Signature
─────────────────────────────────────────────────
Signer key:    0x<ed25519-public-key-hex>
Hash:          0x<keccak256>
Signature:     0x<64-byte-ed25519-sig>
```

JSON output fields: `signerPublicKey`, `hash`, `signature`

### Verify

Verify an EIP-712 signature. The algorithm is **auto-detected from the signature length**:

- **65-byte signature** (0x + 130 hex chars) → ECDSA: recovers the EVM signer address via `ecrecover`, optionally asserts it matches `--expected-signer`
- **64-byte signature** (0x + 128 hex chars) → Ed25519: verifies the signature against a KMS-managed public key

Passing `--key`/`--key-manager` with a 65-byte signature, or `--expected-signer` with a 64-byte signature, is a validation error.

```bash
# ECDSA — recover signer from typed data
hcli eip712 verify \
  --domain '{"name":"MyApp","version":"1","chainId":295}' \
  --types '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}' \
  --message '{"from":"0xAb...","contents":"Hello"}' \
  --signature 0x<65-byte-hex>

# ECDSA — from pre-computed hash, with expected signer assertion
hcli eip712 verify \
  --hash 0x<keccak256> \
  --signature 0x<65-byte-hex> \
  --expected-signer 0xAbCd...1234

hcli eip712 verify ... --expected-signer 0.0.12345
hcli eip712 verify ... --expected-signer my-account-alias

# Ed25519 — verify against KMS key
hcli eip712 verify \
  --key my-ed25519-key \
  --domain ./domain.json --types ./types.json --message ./message.json \
  --signature 0x<64-byte-hex>

hcli eip712 verify \
  --key my-ed25519-key \
  --hash 0x<keccak256> \
  --signature 0x<64-byte-hex>
```

**Options:**

- `-K, --key <string>` - Public key to verify against (Ed25519 only). Accepts key reference, account alias, or account ID
- `-k, --key-manager <string>` - Key manager: `local` or `local_encrypted` (defaults to config setting, Ed25519 only)
- `-H, --hash <string>` - Pre-computed EIP-712 digest (0x-prefixed hex). Mutually exclusive with `--domain`/`--types`/`--message`
- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file
- `-m, --message <string>` - Signed message object as inline JSON or path to a JSON file
- `-s, --signature <string>` - Signature to verify: 0x-prefixed 65-byte hex (ECDSA) or 64-byte hex (Ed25519) (required)
- `-e, --expected-signer <string>` - Account to assert against the recovered signer (ECDSA only). Accepts EVM address (`0x...`), Hedera account ID (`0.0.xxx`), or account alias

Provide either `--hash` OR all three of `--domain`, `--types`, `--message` — not both.

**Output (ECDSA):**

```
EIP-712 Verification
─────────────────────────────────────────────────
Recovered Signer:  0xAbCd...1234
Match:             ✓ yes
```

JSON output fields: `recoveredSigner`, `match?` (only present when `--expected-signer` is used)

**Output (Ed25519):**

```
EIP-712 Verification
─────────────────────────────────────────────────
Signer key:        <ed25519-public-key-hex>
Hash:              0x<keccak256>
Verified:          ✓ yes
```

JSON output fields: `signerPublicKey`, `hash`, `verified`

## Workflow Example

```bash
# 1. Compute the digest
hcli eip712 hash \
  --domain ./permit-domain.json \
  --types ./permit-types.json \
  --message ./permit-message.json

# 2a. Sign with an ECDSA key (algorithm auto-detected)
hcli eip712 sign \
  --key alice \
  --hash 0x<hash-from-step-1>

# 2b. Or sign with an Ed25519 key (algorithm auto-detected)
hcli eip712 sign \
  --key alice-ed25519 \
  --hash 0x<hash-from-step-1>

# 3a. Verify ECDSA signature (65-byte → ECDSA path auto-selected)
hcli eip712 verify \
  --hash 0x<hash-from-step-1> \
  --signature 0x<65-byte-ecdsa-signature> \
  --expected-signer alice

# 3b. Verify Ed25519 signature (64-byte → Ed25519 path auto-selected)
hcli eip712 verify \
  --key alice-ed25519 \
  --hash 0x<hash-from-step-1> \
  --signature 0x<64-byte-ed25519-signature>
```

## Notes

- **`sign`**: Algorithm is auto-detected from `kmsRecord.keyAlgorithm` after key resolution. Unsupported algorithms throw a `ValidationError`.
- **`verify`**: Algorithm is auto-detected from signature length (65 bytes → ECDSA, 64 bytes → Ed25519). Passing algorithm-specific options with the wrong signature length throws a `ValidationError`.
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
