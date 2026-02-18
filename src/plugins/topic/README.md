# Topic Plugin

Complete topic management plugin for the Hiero CLI following the plugin architecture.

## 🏗️ Architecture

- **Stateless handlers** – no shared globals; all dependencies injected via `CommandHandlerArgs`
- **Manifest-driven** – commands, options, capabilities, and output schemas declared in `manifest.ts`
- **Namespace isolation** – topic metadata persisted in `topic-topics`
- **Zod + JSON Schema** – single source of truth for topic state validation
- **Structured output** – every handler returns `CommandExecutionResult` with standardized output
- **Typed Core API access** – topic creation, mirror node queries, alias/KMS coordination

## 📁 Structure

```
src/plugins/topic/
├── manifest.ts              # Command definitions + output specs
├── schema.ts                # Zod schema + JSON Schema export
├── commands/
│   ├── create/
│   │   ├── handler.ts       # Create topic
│   │   ├── output.ts        # Output schema & template
│   │   └── index.ts
│   ├── list/
│   │   ├── handler.ts       # List topics from state
│   │   ├── output.ts
│   │   └── index.ts
│   ├── submit-message/
│   │   ├── handler.ts       # Submit HCS message
│   │   ├── output.ts
│   │   └── index.ts
│   └── find-message/
│       ├── handler.ts       # Mirror node lookups
│       ├── output.ts
│       └── index.ts
├── zustand-state-helper.ts  # Helper around `api.state`
└── index.ts                 # Plugin exports
```

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output that includes:

- `status`: Success or failure status
- `errorMessage`: Optional error message (present when status is not 'success')
- `outputJson`: JSON string conforming to the output schema defined in `output.ts`

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Topic Create

Create a Hedera topic with optional memo and admin/submit keys. Keys may be resolved from aliases or imported into KMS on-the-fly.

```bash
hcli topic create \
  --name marketing-updates \
  --memo "Weekly digest" \
  --admin-key alice \
  --submit-key bob

# Provide raw private keys (imported into KMS automatically)
hcli topic create \
  --memo "Immutable topic" \
  --admin-key 302e020100300506032b6570... \
  --submit-key 302e020100300506032b6570...
```

### Topic List

List topics stored in the CLI state (filtered by network if needed) with quick stats about memos and attached keys.

```bash
hcli topic list
hcli topic list --network testnet
```

### Topic Submit Message

Submit a message to a topic using an alias or topic ID. Handles signing with the stored submit key when required.

```bash
# Using alias registered during topic creation
hcli topic submit-message \
  --topic marketing-updates \
  --message "Next AMA on Thursday"

# Using explicit topic ID
hcli topic submit-message \
  --topic 0.0.900123 \
  --message '{"event":"mint","amount":10}'
```

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

## 📝 Parameter Formats

- **Topic reference**: alias registered in the CLI or explicit `0.0.x` ID
- **Keys**: account alias (resolved via `api.alias`) or raw private key string (imported into KMS and referenced via `keyRefId`)
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
- `api.logger` – progress logging (suppressed automatically in `--script` mode)

## 📤 Output Formatting

All commands return structured output through the `CommandExecutionResult` interface:

```typescript
interface CommandExecutionResult {
  status: 'success' | 'failure';
  errorMessage?: string; // Present when status !== 'success'
  outputJson?: string; // JSON string conforming to the output schema
}
```

**Output Structure:**

- Each command defines a Zod schema (`commands/*/output.ts`) and Handlebars template
- All errors are returned in the result structure, ensuring consistent error handling
- CLI handles validation, `--format human|json|yaml`, `--output <path>`, and script-mode suppression

The `outputJson` field contains a JSON string that conforms to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

## 📊 State Management

Topics are stored under `topic-topics` with the schema defined in `schema.ts`:

```ts
interface TopicData {
  name: string;
  topicId: string;
  memo?: string;
  adminKeyRefId?: string;
  submitKeyRefId?: string;
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
- Output structure compliance tests ensure every handler returns a valid `CommandExecutionResult`.
