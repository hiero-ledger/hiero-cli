# EIP-712 Plugin

Sign and verify EIP-712 structured typed data using ECDSA keys managed by the CLI KMS. Useful for DeFi permit flows, off-chain authorizations, meta-transactions, and any dApp integration running on Hedera that requires typed data signatures.

## Architecture

- **Stateless**: No local state — sign and verify are pure operations
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
│   ├── sign/
│   │   ├── handler.ts       # Eip712SignCommand + eip712Sign()
│   │   ├── index.ts
│   │   ├── input.ts         # Zod schema: key, keyManager, domain, types, message
│   │   └── output.ts        # Zod schema + human template
│   └── verify/
│       ├── handler.ts       # Eip712VerifyCommand + eip712Verify()
│       ├── index.ts
│       ├── input.ts         # Zod schema: domain, types, message, signature, expectedSigner
│       └── output.ts        # Zod schema + human template
└── __tests__/unit/
    ├── sign.test.ts
    ├── verify.test.ts
    └── helpers/
        ├── fixtures.ts
        └── mocks.ts
```

## Commands

### Sign

Sign an EIP-712 typed data payload using an ECDSA key from the KMS.

```bash
hcli eip712 sign \
  --key my-ecdsa-key \
  --domain '{"name":"MyApp","version":"1","chainId":295}' \
  --types '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}' \
  --message '{"from":"0xAb...","contents":"Hello"}'

# Domain and types from JSON files
hcli eip712 sign \
  --key my-ecdsa-key \
  --domain ./domain.json \
  --types ./types.json \
  --message ./message.json
```

**Options:**

- `-K, --key <string>` - Signing key (defaults to operator). Accepts `accountId:privateKey`, `ecdsa:private:{hex}`, key reference (`kr_xxx`), or account alias
- `-k, --key-manager <string>` - Key manager: `local` or `local_encrypted` (defaults to config setting)
- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file (required)
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file (required)
- `-m, --message <string>` - Message object as inline JSON or path to a JSON file (required)

**Output:**

```
EIP-712 Signature
─────────────────────────────────────────────────
Signer (EVM):  0xAbCd...1234
Signature:     0x<r><s><v>
  r:           0x...
  s:           0x...
  v:           27
```

JSON output fields: `signerEvm`, `signature`, `r`, `s`, `v`

### Verify

Recover the EVM signer address from an EIP-712 signature and optionally assert it matches an expected signer.

```bash
hcli eip712 verify \
  --domain '{"name":"MyApp","version":"1","chainId":295}' \
  --types '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}' \
  --message '{"from":"0xAb...","contents":"Hello"}' \
  --signature 0x<65-byte-hex>

# With expected signer assertion (accepts EVM address, account ID, or alias)
hcli eip712 verify \
  --domain ./domain.json --types ./types.json --message ./message.json \
  --signature 0x... \
  --expected-signer 0xAbCd...1234

hcli eip712 verify ... --expected-signer 0.0.12345
hcli eip712 verify ... --expected-signer my-account-alias
```

**Options:**

- `-d, --domain <string>` - EIP-712 domain as inline JSON or path to a JSON file (required)
- `-t, --types <string>` - EIP-712 types definition as inline JSON or path to a JSON file (required)
- `-m, --message <string>` - Signed message object as inline JSON or path to a JSON file (required)
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

## Workflow Example

```bash
# 1. Sign a permit-style payload
hcli eip712 sign \
  --key alice \
  --domain ./permit-domain.json \
  --types ./permit-types.json \
  --message ./permit-message.json

# 2. Verify the signature was produced by alice
hcli eip712 verify \
  --domain ./permit-domain.json \
  --types ./permit-types.json \
  --message ./permit-message.json \
  --signature 0x<signature-from-step-1> \
  --expected-signer alice
```

## Notes

- Only **ECDSA secp256k1** keys are supported. Passing an Ed25519 key throws a `ValidationError`.
- The `--primary-type` is inferred automatically by ethers.js from the provided types definition.
- Domain, types, and message accept either inline JSON strings or paths to JSON files.
- The plugin is stateless — no state is written to `~/.hiero-cli/state/`.

## Core API Integration

- `api.keyResolver` — resolves `--key` to a signing credential
- `api.kms` — retrieves the key record and signer handle
- `api.kms.getSignerHandle(keyRefId).signWithWallet(domain, types, message)` — ethers.js wallet `signTypedData`
- `api.identityResolution` — resolves `--expected-signer` to an EVM address (for Hedera account IDs and aliases)
- `api.network` — provides current network for identity resolution
