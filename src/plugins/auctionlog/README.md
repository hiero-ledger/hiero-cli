# Auctionlog Plugin

Privacy-preserving audit trail for B2B blind auctions using Hedera Consensus Service (HCS).

Publishes cryptographic commitment hashes to HCS topics that prove the fairness and timing of auction events — without revealing any business-sensitive data like bid values, delivery terms, or party identities.

## 🎯 Problem Solved

In enterprise procurement, auctions must be **provably fair** — but the data is **confidential**. Public blockchains give transparency but destroy privacy. Private systems give privacy but demand trust.

This plugin bridges the gap: it lets you publish a **public audit trail** that proves the **order and timing** of auction events, while the actual business data stays private.

**Measurable impact:**
- Eliminates manual audit report generation (saves hours per procurement cycle)
- Provides tamper-evident proof of process integrity
- Reduces regulatory compliance burden with exportable, verifiable artifacts
- Works with any private compute layer — not coupled to a specific L1

## 🏗️ Architecture

- **Stateless handlers** — no shared globals; all dependencies injected via `CommandHandlerArgs`
- **Manifest-driven** — commands, options, and output schemas declared in `manifest.ts`
- **Namespace isolation** — audit data persisted under `auctionlog-data`
- **Zod validation** — input and output schemas ensure type safety
- **Structured output** — every handler returns `CommandExecutionResult` with JSON + Handlebars templates
- **Typed Core API** — uses `api.topic` for HCS operations, `api.state` for persistence

## 📁 Structure

```
src/plugins/auctionlog/
├── manifest.ts              # Plugin manifest with all 4 commands
├── types.ts                 # TypeScript types and stage definitions
├── index.ts                 # Plugin exports
├── commands/
│   ├── publish/
│   │   ├── handler.ts       # Publish commitment to HCS topic
│   │   ├── input.ts         # Zod input schema
│   │   ├── output.ts        # Zod output schema + Handlebars template
│   │   └── index.ts         # Command exports
│   ├── verify/
│   │   ├── handler.ts       # Verify commitment integrity
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── index.ts
│   ├── export/
│   │   ├── handler.ts       # Export audit trail as JSON or CSV
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── index.ts
│   └── list/
│       ├── handler.ts       # List all tracked auctions
│       ├── input.ts
│       ├── output.ts
│       └── index.ts
└── __tests__/
    └── unit/
        ├── publish.test.ts  # 6 tests
        ├── verify.test.ts   # 3 tests
        ├── export.test.ts   # 3 tests
        └── list.test.ts     # 2 tests
```

## 🚀 Commands

### `auctionlog publish`

Publish a commitment hash to an HCS topic for a specific auction stage. The commitment is `SHA-256(JSON.stringify({ auctionId, stage, cantonRef, adiTx, timestamp, nonce }))`. No business data is published — only the hash.

```bash
# Publish an "auction created" commitment
hcli auctionlog publish \
  --auction-id AUCTION-001 \
  --stage created \
  --canton-ref canton-tx-abc123 \
  --adi-tx 0xdeadbeef...

# Publish "bidding closed" to an existing topic
hcli auctionlog publish \
  --auction-id AUCTION-001 \
  --stage bidding-closed \
  --topic 0.0.1234567

# Publish "awarded" with all cross-chain references
hcli auctionlog publish \
  --auction-id AUCTION-001 \
  --stage awarded \
  --canton-ref canton-award-xyz \
  --adi-tx 0xb800fae43fb...
```

**Expected output:**
```
✅ Audit commitment published

   Auction ID: AUCTION-001
   Stage: awarded
   Commitment: 0x7a3f8e2d...
   Topic: 0.0.1234567  (→ HashScan link)
   Sequence: 3
   Canton Ref: canton-award-xyz
   ADI Tx: 0xb800fae43fb...
   Timestamp: 2026-02-21T12:34:56.789Z
```

**Behavior:**
- If `--topic` is omitted and no topic exists for this auction, a new HCS topic is created automatically
- If a topic was previously created for this auction, it is reused from local state
- The commitment hash is deterministic — same inputs always produce the same hash
- A random nonce ensures each publication is unique even for repeated stages

**Options:**

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--auction-id` | `-a` | ✅ | Unique auction identifier |
| `--stage` | `-s` | ✅ | Auction stage (see [Valid Stages](#valid-stages)) |
| `--topic` | `-t` | ❌ | Existing HCS topic ID (auto-creates if omitted) |
| `--canton-ref` | `-c` | ❌ | Canton Network transaction reference |
| `--adi-tx` | `-d` | ❌ | ADI Network transaction hash |

### `auctionlog verify`

Re-compute commitment hashes from stored fields and compare against published values. Detects any tampering.

```bash
# Verify all stages for an auction
hcli auctionlog verify --auction-id AUCTION-001

# Verify a specific stage
hcli auctionlog verify --auction-id AUCTION-001 --stage awarded
```

**Expected output (all valid):**
```
✅ All commitments verified for auction AUCTION-001

   Topic: 0.0.1234567  (→ HashScan link)
   Stages verified: 3 / 3

   ✅ created — seq #1 — 2026-02-21T10:00:00.000Z
      Hash: 0x7a3f8e2d...
   ✅ bidding-closed — seq #2 — 2026-02-21T11:00:00.000Z
      Hash: 0x91bc4e8a...
   ✅ awarded — seq #3 — 2026-02-21T12:00:00.000Z
      Hash: 0xc5d2f710...
```

**Expected output (tampered):**
```
⚠️  Some commitments FAILED verification for auction AUCTION-001

   Topic: 0.0.1234567
   Stages verified: 2 / 3

   ✅ created — seq #1 — 2026-02-21T10:00:00.000Z
   ❌ bidding-closed — seq #2 — 2026-02-21T11:00:00.000Z
      Reason: Hash mismatch: expected 0x91bc..., got 0xdead... Data may have been tampered with.
   ✅ awarded — seq #3 — 2026-02-21T12:00:00.000Z
```

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--auction-id` | `-a` | ✅ | Auction ID to verify |
| `--stage` | `-s` | ❌ | Specific stage to verify (verifies all if omitted) |

### `auctionlog export`

Export the full audit timeline as a JSON or CSV artifact. Suitable for compliance review, legal discovery, or regulatory audit.

```bash
# Export as JSON (default)
hcli auctionlog export --auction-id AUCTION-001

# Export as CSV
hcli auctionlog export --auction-id AUCTION-001 --type csv

# Export to file
hcli auctionlog export \
  --auction-id AUCTION-001 \
  --type json \
  --file ./audit-AUCTION-001.json
```

**Expected output:**
```
📦 Exported 4 audit entries for auction AUCTION-001

   Topic: 0.0.1234567  (→ HashScan link)
   Format: json

Timeline:
   1. [created] 2026-02-21T10:00:00.000Z — 0x7a3f8e2d...
   2. [bidding-closed] 2026-02-21T11:00:00.000Z — 0x91bc4e8a...
   3. [awarded] 2026-02-21T12:00:00.000Z — 0xc5d2f710...
   4. [settled] 2026-02-21T13:00:00.000Z — 0xe8f1a234...
```

**JSON export format:**
```json
{
  "auctionId": "AUCTION-001",
  "topicId": "0.0.1234567",
  "network": "testnet",
  "exportedAt": "2026-02-21T14:00:00.000Z",
  "entries": [
    {
      "stage": "created",
      "commitmentHash": "0x7a3f8e2d...",
      "timestamp": "2026-02-21T10:00:00.000Z",
      "sequenceNumber": 1,
      "cantonRef": "canton-tx-abc",
      "adiTx": "0xdeadbeef",
      "nonce": "0x1234..."
    }
  ]
}
```

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--auction-id` | `-a` | ✅ | Auction ID to export |
| `--type` | `-T` | ❌ | Export format: `json` (default) or `csv` |
| `--file` | `-f` | ❌ | Output file path (prints to stdout if omitted) |

### `auctionlog list`

List all auctions that have at least one published audit commitment.

```bash
hcli auctionlog list
```

**Expected output:**
```
📋 Tracked Auctions (2)

   AUCTION-001
      Topic: 0.0.1234567
      Last Stage: settled
      Updated: 2026-02-21T13:00:00.000Z
      Stages Published: 4

   AUCTION-002
      Topic: 0.0.1234568
      Last Stage: bidding-closed
      Updated: 2026-02-21T11:30:00.000Z
      Stages Published: 2
```

## 📝 Valid Stages

| Stage | Description |
|-------|-------------|
| `created` | Auction has been created with terms and scoring weights |
| `bidding-open` | Bidding window is open for submissions |
| `bidding-closed` | Bidding window has closed, no more bids accepted |
| `awarded` | Winner has been selected and award proof generated |
| `settled` | Payment/escrow settled on-chain |
| `disputed` | Dispute raised by a participant |

## 🔐 Privacy Guarantee

The commitment hash is computed as:

```
SHA-256(JSON.stringify({
  auctionId,    // e.g. "AUCTION-001"
  stage,        // e.g. "awarded"
  cantonRef,    // e.g. "canton-tx-abc"
  adiTx,        // e.g. "0xdeadbeef..."
  timestamp,    // ISO 8601
  nonce         // random 16-byte hex
}))
```

**What is published to HCS (public):**
- The commitment hash
- The stage name
- The auction ID
- The timestamp

**What is NOT published (private):**
- Canton transaction references
- ADI transaction hashes
- The nonce (prevents rainbow table attacks)
- All bid values, terms, identities, and business data

This means anyone can verify the *sequence and timing* of auction events, but nobody can reverse-engineer the hash into actual business data.

## 🔧 Core API Integration

| API | Usage |
|-----|-------|
| `api.topic.createTopic()` | Create new HCS topic for auction |
| `api.topic.submitMessage()` | Publish commitment as HCS message |
| `api.txExecution.signAndExecute()` | Sign and submit HCS transactions |
| `api.network.getCurrentNetwork()` | Resolve current network (testnet/mainnet) |
| `api.state.get/set/getKeys()` | Persist audit entries and auction metadata |

## 📊 State Management

Audit entries are stored under the `auctionlog-data` namespace:

| Key Pattern | Data |
|-------------|------|
| `{auctionId}` | Auction metadata: `{ topicId, lastStage, lastUpdated }` |
| `{auctionId}:{stage}` | Full audit entry: commitment hash, nonce, refs, sequence number |

## 📤 Output Formatting

All commands return structured output through the `CommandExecutionResult` interface:

```typescript
interface CommandExecutionResult {
  status: 'success' | 'failure';
  errorMessage?: string;
  outputJson?: string;  // JSON conforming to the Zod output schema
}
```

Each command defines:
- **Zod schema** (`output.ts`) for machine-readable validation
- **Handlebars template** for human-readable `--format human` output
- **JSON output** compatible with `--format json` and `--output <path>`

## 🧪 Testing

14 unit tests covering all commands:

```
auctionlog publish
  ✓ should publish a commitment and return success
  ✓ should create a new topic if none exists
  ✓ should reuse existing topic from state
  ✓ should reject invalid stage
  ✓ should reject missing auctionId
  ✓ should return failure when topic creation fails

auctionlog verify
  ✓ should verify a valid commitment
  ✓ should detect tampered commitment
  ✓ should fail if no audit log found

auctionlog export
  ✓ should export as JSON by default
  ✓ should export as CSV when requested
  ✓ should fail if no entries found

auctionlog list
  ✓ should list tracked auctions
  ✓ should return empty when no auctions exist
```

Run tests:
```bash
npx jest --testPathPatterns="auctionlog" --verbose
```

## 💡 Use Cases Beyond This Hackathon

This plugin is designed to be **generally useful** for any workflow that needs a tamper-evident public audit trail on Hedera:

- **Procurement & RFP processes** — prove bid timing and scoring fairness
- **Regulatory compliance** — exportable JSON/CSV audit artifacts for legal review
- **Supply chain events** — publish commitment hashes for shipment, customs, delivery milestones
- **Corporate governance** — voting results, board resolutions, compliance checkpoints
- **Multi-party agreements** — prove the sequence of approvals without exposing terms
- **Financial audits** — timestamp-ordered commitment trail for transaction verification

The `publish → verify → export` workflow is a reusable pattern for any process where you need to prove "this happened at this time" without revealing "what exactly happened."
