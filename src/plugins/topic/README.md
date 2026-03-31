# Topic Plugin

Complete topic management plugin for the Hiero CLI following the plugin architecture.

## 🏗️ Architecture

- **Stateless handlers** – no shared globals; all dependencies injected via `CommandHandlerArgs`
- **Manifest-driven** – commands, options, capabilities, and output schemas declared in `manifest.ts`
- **Namespace isolation** – topic metadata persisted in `topic-topics`
- **Zod + JSON Schema** – single source of truth for topic state validation
- **Structured output** – every handler returns `CommandResult` with standardized output
- **Typed Core API access** – topic creation, mirror node queries, alias/KMS coordination

## 📁 Structure

```
src/plugins/topic/
├── manifest.ts              # Command definitions + output specs
├── schema.ts                # Zod schema + JSON Schema export
├── commands/
│   ├── create/
│   │   ├── handler.ts       # Create topic
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema & template
│   │   ├── types.ts         # Command types
│   │   └── index.ts
│   ├── import/
│   │   ├── handler.ts       # Import topic from mirror node
│   │   ├── output.ts
│   │   └── index.ts
│   ├── list/
│   │   ├── handler.ts       # List topics from state
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts
│   │   └── index.ts
│   ├── submit-message/
│   │   ├── handler.ts       # Submit HCS message
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts
│   │   ├── types.ts         # Command types
│   │   └── index.ts
│   ├── find-message/
│   │   ├── handler.ts       # Mirror node lookups
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts
│   │   ├── types.ts         # Command types
│   │   └── index.ts
│   ├── update/
│   │   ├── handler.ts       # Update topic fields
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema & template
│   │   ├── types.ts         # Command types
│   │   └── index.ts
│   └── delete/
│       ├── handler.ts       # Delete topic from state
│       ├── input.ts         # Input schema
│       ├── output.ts
│       └── index.ts
├── hooks/
│   ├── batch-create/
│   │   ├── handler.ts       # TopicCreateBatchStateHook - persists topic state after batch execution
│   │   ├── types.ts         # TopicCreateNormalisedParamsSchema for batch item validation
│   │   └── index.ts         # Hook exports
│   ├── batch-update/
│   │   ├── handler.ts       # TopicUpdateBatchStateHook - updates state after batched topic update
│   │   ├── types.ts         # TopicUpdateNormalisedParamsSchema for batch item validation
│   │   └── index.ts
│   └── batch-delete/
│       ├── handler.ts       # TopicDeleteBatchStateHook - updates state after batched topic delete
│       ├── types.ts         # TopicDeleteNormalisedParamsSchema for batch item validation
│       └── index.ts
├── utils/
│   ├── message-helpers.ts   # Message handling utilities
│   ├── messageFilters.ts    # Message filter helpers
│   └── topicResolver.ts     # Topic resolution utilities
├── zustand-state-helper.ts  # Helper around `api.state`
├── __tests__/unit/          # Unit tests
└── index.ts                 # Plugin exports
```

## 🚀 Commands

All commands return `CommandResult` with structured output data in the `result` field. Errors are thrown as typed `CliError` instances and handled uniformly by the core framework.

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Topic Create

Create a Hedera topic with optional memo and admin/submit keys. Keys may be resolved from aliases or imported into KMS on-the-fly. Pass `--admin-key` and `--submit-key` multiple times for multiple keys.

```bash
# Single key per role
hcli topic create \
  --name marketing-updates \
  --memo "Weekly digest" \
  --admin-key alice \
  --submit-key bob

# Multiple keys (any one can sign for admin or submit)
hcli topic create \
  --name multi-sig-topic \
  --admin-key alice --admin-key bob --admin-key carol \
  --submit-key key1 --submit-key key2

# Raw private keys (imported into KMS automatically)
hcli topic create \
  --memo "Immutable topic" \
  --admin-key 302e020100300506032b6570... \
  --submit-key 302e020100300506032b6570...
```

**Batch support:** The `topic create` command registers the `batchify` hook. Pass `--batch <batch-name>` to add topic creation to a batch instead of executing immediately:

```bash
hcli topic create --name marketing-updates --memo "Weekly digest" --batch my-batch
```

When the batch is executed via `hcli batch execute --name my-batch`, the `TopicCreateBatchStateHook` runs to persist each created topic to state.

### Topic Import

Import an existing topic into local state by topic ID. Fetches topic info from
mirror node, extracts admin/submit keys (including KeyList and ThresholdKey),
matches them with KMS via `findByPublicKey`, and stores `adminKeyRefIds`,
`submitKeyRefIds`, and thresholds for use with submit-message.

```bash
hcli topic import --topic 0.0.123456 --name importedTopic
```

### Topic List

List topics stored in the CLI state (filtered by network if needed) with quick stats about memos and attached keys.

```bash
hcli topic list
hcli topic list --network testnet
```

### Topic Update

Update an existing topic's fields. Requires admin key for most updates. Fields not provided remain unchanged. Pass `"null"` to clear memo, submit key, or auto-renew account.

```bash
# Update memo
hcli topic update --topic my-topic --memo "Updated description"

# Clear memo
hcli topic update --topic my-topic --memo null

# Replace submit key
hcli topic update --topic my-topic --submit-key new-key

# Clear submit key (make topic public)
hcli topic update --topic my-topic --submit-key null

# Update multiple keys with threshold
hcli topic update --topic my-topic \
  --admin-key alice --admin-key bob --admin-key carol \
  --admin-key-threshold 2

# Update auto-renew settings
hcli topic update --topic my-topic \
  --auto-renew-account operator \
  --auto-renew-period 7776000

# Update expiration time
hcli topic update --topic my-topic --expiration-time 2026-01-01T00:00:00Z
```

**Batch support:** `topic update` registers `batchify`. Pass `--batch <batch-name>` to queue the update; after `hcli batch execute`, `TopicUpdateBatchStateHook` reconciles local state.

### Topic Delete

Remove a topic from the network and local state, or only from local state. Without `--state-only`, the handler submits a `TopicDeleteTransaction` (admin keys are taken from state, mirror node, or explicit `--admin-key`). With `--state-only`, only CLI state is cleared.

```bash
hcli topic delete --topic myTopic --confirm
hcli topic delete --topic 0.0.123456 --state-only --confirm
```

**Batch support:** `topic delete` registers `batchify`. Pass `--batch <batch-name>` to queue the delete; after `hcli batch execute`, `TopicDeleteBatchStateHook` reconciles local state.

### Topic Submit Message

Submit a message to a topic using an alias or topic ID. Handles signing with
the stored submit key when required. For threshold topics (e.g. 2-of-3), pass
`--signer` multiple times to meet the required signature count.

```bash
# Using alias registered during topic creation
hcli topic submit-message \
  --topic marketing-updates \
  --message "Next AMA on Thursday"

# Using explicit topic ID
hcli topic submit-message \
  --topic 0.0.900123 \
  --message '{"event":"mint","amount":10}'

# Threshold topic (2-of-3): provide 2 signers
hcli topic submit-message \
  --topic multi-sig-topic \
  --message "Approved" \
  --signer alice --signer bob
```

**Batch support:** The `topic submit-message` command registers the `batchify` hook. Pass `--batch <batch-name>` to add message submission to a batch instead of executing immediately.

### Topic Find Message

Query mirror node data for a topic by sequence number or with range filters.

```bash
# Fetch a specific sequence number
hcli topic find-message \
  --topic marketing-updates \
  --sequence-eq 42

# Fetch all messages after a sequence number
hcli topic find-message \
  --topic 0.0.900123 \
  --sequence-gt 100
```

## 📦 Batch Support

The `topic create`, `topic update`, `topic submit-message`, and `topic delete` commands support the `--batch` / `-B` flag via the batch plugin's `batchify` hook. When you pass `--batch <batch-name>`:

1. **No immediate execution** – The transaction is not submitted to the network. Instead, it is serialized and added to the specified batch.
2. **Deferred execution** – Run `hcli batch execute --name <batch-name>` to submit all batched transactions atomically.
3. **State persistence** – After successful batch execution, the relevant state hook runs: `TopicCreateBatchStateHook` persists new topics (fetches receipt, saves alias), `TopicUpdateBatchStateHook` reconciles updated fields, and `TopicDeleteBatchStateHook` removes deleted topics from state.

**Example workflow:**

```bash
# 1. Create a batch
hcli batch create --name my-batch --key operator-alias

# 2. Add topic creation to the batch
hcli topic create --name marketing-updates --memo "Weekly digest" --batch my-batch

# 3. Execute the batch
hcli batch execute --name my-batch
```

The `--batch` option is automatically injected by the batchify hook. See the [Batch Plugin README](../batch/README.md) for full batch documentation.

## 📝 Parameter Formats

- **Topic reference**: alias registered in the CLI or explicit `0.0.x` ID
- **Keys**: account alias (resolved via `api.alias`) or raw private key string (imported into KMS and referenced via `keyRefId`).
- **Messages**: UTF-8 strings; mirror results are automatically Base64-decoded
- **Sequence filters**: `--sequence-gt`, `--sequence-gte`, `--sequence-lt`, `--sequence-lte`, `--sequence-eq` (short forms: `-g`, `-G`, `-l`, `-L`, `-e`)

## 🔧 Core API Integration

- `api.topic` – topic creation + message submission transactions
- `api.txExecution` – signing with operator, admin, or submit keys
- `api.alias` – resolve/register topic aliases and key references
- `api.kms` – secure private key import for admin/submit keys
- `api.mirror` – query messages via Hedera Mirror Node
- `api.state` – namespaced topic storage through `ZustandTopicStateHelper`
- `api.network` – current network resolution for IDs and filters
- `api.receipt` – transaction receipt retrieval (used by `TopicCreateBatchStateHook`)
- `api.logger` – progress logging (suppressed automatically in `--script` mode)

## 📤 Output Formatting

All commands return structured output through the `CommandResult` interface:

```typescript
interface CommandResult {
  result: object;
}
```

**Output Structure:**

- Each command defines a Zod schema (`commands/*/output.ts`) and Handlebars template
- All errors are returned in the result structure, ensuring consistent error handling
- CLI handles validation, `--format human|json|yaml`, `--output <path>`, and script-mode suppression

The `result` field contains a structured object conforming to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

## 📊 State Management

Topics are stored under `topic-topics` with the schema defined in `schema.ts`:

```ts
interface TopicData {
  name?: string;
  topicId: string;
  memo?: string;
  adminKeyRefIds?: string[];
  submitKeyRefIds?: string[];
  adminKeyThreshold?: number; // M-of-N for admin (from KeyList/ThresholdKey)
  submitKeyThreshold?: number; // M-of-N for submit (from KeyList/ThresholdKey)
  autoRenewAccount?: string;
  autoRenewPeriod?: number;
  expirationTime?: string;
  network: 'mainnet' | 'testnet' | 'previewnet' | 'localnet';
  createdAt: string;
}
```

Validation is enforced via Zod at runtime and the generated JSON Schema is embedded in the plugin manifest for manifest-level declarations.

## 🧪 Testing Notes

- Handlers are unit-tested in isolation with mocked Core API services.
- Schema parsing is covered through `TopicDataSchema`.
- Output structure compliance tests ensure every handler returns a valid `CommandResult`.
- Topic creation in batch (batch-create hook) is covered by `batch-create.test.ts`.
