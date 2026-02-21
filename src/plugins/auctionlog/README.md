# Auctionlog Plugin

Privacy-preserving audit trail for B2B blind auctions using Hedera Consensus Service (HCS).

Publishes SHA-256 commitment hashes to HCS topics that prove the fairness and timing of auction events — without revealing any business-sensitive data like bid values, delivery terms, or party identities.

## Problem Solved

In enterprise procurement, auctions must be **provably fair** — but the data is **confidential**. Public blockchains give transparency but destroy privacy. Private systems give privacy but demand trust.

This plugin bridges the gap: it lets you publish a **public audit trail** that proves the **order and timing** of auction events, while the actual business data stays private.

**Measurable impact:**
- Eliminates manual audit report generation (saves hours per procurement cycle)
- Provides tamper-evident proof of process integrity
- Reduces regulatory compliance burden with exportable, verifiable artifacts
- Two-layer verification: local hash integrity + on-chain publication proof

## Architecture

- **Stateless handlers** — no shared globals; all dependencies injected via `CommandHandlerArgs`
- **Manifest-driven** — commands, options, and output schemas declared in `manifest.ts`
- **Namespace isolation** — audit data persisted under `auctionlog-data`
- **Zod validation** — input and output schemas ensure type safety at runtime
- **Structured output** — every handler returns `CommandExecutionResult` with JSON + Handlebars templates
- **Typed Core API** — uses `api.topic` for HCS, `api.mirror` for on-chain verification, `api.state` for persistence
- **Cryptographically secure** — SHA-256 hashing with `crypto.randomBytes` nonces
- **Stage ordering** — enforces chronological auction lifecycle progression

## Structure

```
src/plugins/auctionlog/
├── manifest.ts              # Plugin manifest with all 4 commands
├── types.ts                 # TypeScript types, stage definitions, ordering
├── index.ts                 # Plugin exports
├── commands/
│   ├── publish/
│   │   ├── handler.ts       # Publish commitment to HCS topic
│   │   ├── input.ts         # Zod input schema
│   │   ├── output.ts        # Zod output schema + Handlebars template
│   │   └── index.ts         # Command exports
│   ├── verify/
│   │   ├── handler.ts       # Two-layer verification (local + on-chain)
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
        ├── publish.test.ts  # 10 tests
        ├── verify.test.ts   # 7 tests
        ├── export.test.ts   # 5 tests
        └── list.test.ts     # 3 tests
```

## Commands

### `auctionlog publish`

Publish a SHA-256 commitment hash to an HCS topic for a specific auction stage.

```bash
# Publish an "auction created" commitment
hcli auctionlog publish \
  --auction-id AUCTION-001 \
  --stage created \
  --metadata "canton-tx-abc123,adi-0xdeadbeef"

# Publish "bidding closed" to an existing topic
hcli auctionlog publish \
  --auction-id AUCTION-001 \
  --stage bidding-closed \
  --topic 0.0.1234567

# Publish "awarded" with external references
hcli auctionlog publish \
  --auction-id AUCTION-001 \
  --stage awarded \
  --metadata "canton-award-xyz,scoring-ref-123"
```

**Expected output:**
```
✅ Audit commitment published

   Auction ID: AUCTION-001
   Stage: awarded
   Commitment: 0x7a3f8e2d...
   Topic: 0.0.1234567  (→ HashScan link)
   Sequence: 3
   Timestamp: 2026-02-21T12:34:56.789Z
   Metadata: (included in hash, not published on-chain)
```

**Behavior:**
- If `--topic` is omitted and no topic exists for this auction, a new HCS topic is created automatically
- If a topic was previously created for this auction, it is reused from local state
- The commitment hash is deterministic — same inputs always produce the same hash
- A cryptographically secure random nonce ensures each publication is unique
- **Stage ordering is enforced** — you cannot publish `awarded` before `bidding-closed`
- **Duplicate stages are rejected** — each stage can only be published once per auction
- **`disputed` is special** — it can be published at any time after the auction exists

**Options:**

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--auction-id` | `-a` | ✅ | Unique auction identifier |
| `--stage` | `-s` | ✅ | Auction stage (see [Valid Stages](#valid-stages)) |
| `--topic` | `-t` | ❌ | Existing HCS topic ID (auto-creates if omitted) |
| `--metadata` | `-m` | ❌ | Private metadata included in hash but NOT published on-chain |

### `auctionlog verify`

Verify commitment integrity with two layers:
1. **Local verification** (default): Re-computes the SHA-256 hash from stored fields
2. **On-chain verification** (`--on-chain`): Fetches HCS messages from the mirror node and compares

```bash
# Local-only verification (default)
hcli auctionlog verify --auction-id AUCTION-001

# Full verification: local + on-chain
hcli auctionlog verify --auction-id AUCTION-001 --on-chain

# Verify a specific stage
hcli auctionlog verify --auction-id AUCTION-001 --stage awarded --on-chain
```

**Expected output (all valid, on-chain):**
```
✅ All local commitments verified for auction AUCTION-001
✅ All on-chain commitments match

   Topic: 0.0.1234567  (→ HashScan link)
   Local verified: 3 / 3
   On-chain verified: 3 / 3

   ✅ 🔗 created — seq #1 — 2026-02-21T10:00:00.000Z
      Hash: 0x7a3f8e2d...
   ✅ 🔗 bidding-closed — seq #2 — 2026-02-21T11:00:00.000Z
      Hash: 0x91bc4e8a...
   ✅ 🔗 awarded — seq #3 — 2026-02-21T12:00:00.000Z
      Hash: 0xc5d2f710...
```

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--auction-id` | `-a` | ✅ | Auction ID to verify |
| `--stage` | `-s` | ❌ | Specific stage to verify (verifies all if omitted) |
| `--on-chain` | `-o` | ❌ | Also verify against on-chain HCS messages via mirror node |

### `auctionlog export`

Export the full audit timeline as a JSON or CSV artifact. Use `--redact` to strip sensitive fields before sharing.

```bash
# Export as JSON (default) — CONTAINS SENSITIVE DATA
hcli auctionlog export --auction-id AUCTION-001

# Export with sensitive fields redacted
hcli auctionlog export --auction-id AUCTION-001 --redact

# Export as CSV to file
hcli auctionlog export \
  --auction-id AUCTION-001 \
  --type csv \
  --file ./audit-AUCTION-001.csv \
  --redact
```

**Expected output:**
```
📦 Exported 4 audit entries for auction AUCTION-001

   Topic: 0.0.1234567  (→ HashScan link)
   Format: json
   Mode: REDACTED (nonces and metadata omitted)

Timeline:
   1. [created] 2026-02-21T10:00:00.000Z — 0x7a3f8e2d...
   2. [bidding-closed] 2026-02-21T11:00:00.000Z — 0x91bc4e8a...
   3. [awarded] 2026-02-21T12:00:00.000Z — 0xc5d2f710...
   4. [settled] 2026-02-21T13:00:00.000Z — 0xe8f1a234...
```

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--auction-id` | `-a` | ✅ | Auction ID to export |
| `--type` | `-T` | ❌ | Export format: `json` (default) or `csv` |
| `--file` | `-f` | ❌ | Output file path (prints to stdout if omitted) |
| `--redact` | `-r` | ❌ | Redact nonces and metadata from the export |

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

## Valid Stages

| Stage | Order | Description |
|-------|-------|-------------|
| `created` | 0 | Auction has been created with terms and scoring weights |
| `bidding-open` | 1 | Bidding window is open for submissions |
| `bidding-closed` | 2 | Bidding window has closed, no more bids accepted |
| `awarded` | 3 | Winner has been selected and award proof generated |
| `settled` | 4 | Payment/escrow settled on-chain |
| `disputed` | * | Dispute raised — can occur at any time after creation |

Stages must be published in chronological order (except `disputed`). Duplicate stage publications are rejected.

## Privacy Guarantee

The commitment hash is computed as:

```
SHA-256(JSON.stringify({
  auctionId,    // e.g. "AUCTION-001"
  stage,        // e.g. "awarded"
  metadata,     // e.g. "canton-ref,adi-tx,scoring-proof" (private)
  timestamp,    // ISO 8601
  nonce         // cryptographically secure 16-byte hex
}))
```

**What is published to HCS (public):**
- The commitment hash (SHA-256)
- The stage name
- The auction ID
- The timestamp
- A protocol version number

**What is NOT published (private):**
- Private metadata (external transaction references, scoring data, etc.)
- The nonce (prevents rainbow table attacks on the hash)
- All bid values, terms, identities, and business data

This means anyone can verify the *sequence and timing* of auction events, but nobody can reverse-engineer the hash into actual business data.

**Export sensitivity:** The `export` command can include private fields (nonces, metadata). Use `--redact` to strip them when sharing exports externally.

## Two-Layer Verification

The `verify` command provides two complementary integrity checks:

| Layer | What it proves | How |
|-------|---------------|-----|
| **Local** (default) | Hash matches preimage | Re-computes SHA-256 from stored fields |
| **On-chain** (`--on-chain`) | Hash was published to HCS | Fetches mirror node messages and compares |

Together, these prove:
1. The local data hasn't been modified since publication (local check)
2. The hash actually exists on the Hedera ledger (on-chain check)

If the mirror node is unavailable, on-chain verification gracefully degrades to local-only.

## Core API Integration

| API | Usage |
|-----|-------|
| `api.topic.createTopic()` | Create new HCS topic for auction |
| `api.topic.submitMessage()` | Publish commitment as HCS message |
| `api.txExecution.signAndExecute()` | Sign and submit HCS transactions |
| `api.mirror.getTopicMessages()` | Fetch on-chain messages for verification |
| `api.network.getCurrentNetwork()` | Resolve current network (testnet/mainnet) |
| `api.state.get/set/getKeys()` | Persist audit entries and auction metadata |

## State Management

Audit entries are stored under the `auctionlog-data` namespace:

| Key Pattern | Data |
|-------------|------|
| `{auctionId}` | Auction metadata: `{ topicId, lastStage, lastUpdated }` |
| `{auctionId}:{stage}` | Full audit entry: commitment hash, nonce, metadata, sequence number |

## Testing

25 unit tests covering all commands:

```
auctionlog publish (10 tests)
  ✓ should publish a commitment and return success
  ✓ should create a new topic if none exists
  ✓ should reuse existing topic from state
  ✓ should reject invalid stage
  ✓ should reject missing auctionId
  ✓ should return failure when topic creation fails
  ✓ should reject duplicate stage publication
  ✓ should enforce stage ordering
  ✓ should allow disputed at any time after auction exists
  ✓ should produce deterministic hashes for same inputs
  ✓ should produce different hashes for different inputs

auctionlog verify (7 tests)
  ✓ should verify a valid commitment (local)
  ✓ should detect tampered commitment
  ✓ should fail if no audit log found
  ✓ should perform on-chain verification when --on-chain is set
  ✓ should detect on-chain hash mismatch
  ✓ should gracefully handle mirror node failure

auctionlog export (5 tests)
  ✓ should export as JSON by default
  ✓ should export as CSV when requested
  ✓ should fail if no entries found
  ✓ should redact sensitive fields when --redact is set
  ✓ should fail if no audit log found at all

auctionlog list (3 tests)
  ✓ should list tracked auctions
  ✓ should return empty when no auctions exist
  ✓ should list multiple auctions
```

Run tests:
```bash
npx jest --testPathPatterns="auctionlog" --verbose
```

## Use Cases Beyond This Hackathon

This plugin is designed to be **generally useful** for any workflow that needs a tamper-evident public audit trail on Hedera:

- **Procurement & RFP processes** — prove bid timing and scoring fairness
- **Regulatory compliance** — exportable JSON/CSV audit artifacts for legal review
- **Supply chain events** — publish commitment hashes for shipment, customs, delivery milestones
- **Corporate governance** — voting results, board resolutions, compliance checkpoints
- **Multi-party agreements** — prove the sequence of approvals without exposing terms
- **Financial audits** — timestamp-ordered commitment trail for transaction verification

The `publish → verify → export` workflow is a reusable pattern for any process where you need to prove "this happened at this time" without revealing "what exactly happened."
