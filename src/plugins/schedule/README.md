# Schedule Plugin

Plugin for creating and managing **Hedera scheduled transactions** (`ScheduleCreateTransaction`, `ScheduleSignTransaction`, `ScheduleDeleteTransaction`). It stores named schedule configuration in local state, lets you submit inner transactions as schedules via the `scheduled` hook, add signatures, delete schedules, and verify execution against the Mirror Node.

## Architecture

This plugin follows the plugin architecture principles:

- **Stateful (local records)**: Named schedule entries and options are persisted per network
- **Dependency Injection**: Services are injected into command handlers and hooks
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Namespace Isolation**: Own state namespace (`schedule-transactions`)
- **Type Safety**: Full TypeScript support with Zod input/output schemas
- **Structured Output**: Command handlers return `CommandResult` with standardized output

## Structure

```
src/plugins/schedule/
├── manifest.ts                 # Plugin manifest (commands + scheduled hook)
├── schema.ts                   # Zod schema for persisted schedule entries
├── zustand-state-helper.ts     # State helper (CRUD for schedule records)
├── schedule-helper.ts          # Shared helpers
├── commands/
│   ├── create/
│   │   ├── handler.ts          # Register a named schedule in local state
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── index.ts
│   ├── sign/
│   │   ├── handler.ts          # ScheduleSignTransaction
│   │   ├── input.ts
│   │   ├── output.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── delete/
│   │   ├── handler.ts          # ScheduleDeleteTransaction + optional local cleanup
│   │   ├── input.ts
│   │   ├── output.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── verify/
│       ├── handler.ts          # Mirror Node schedule lookup / state sync
│       ├── input.ts
│       ├── output.ts
│       └── index.ts
├── hooks/
│   └── scheduled/
│       ├── handler.ts          # Wrap inner tx in ScheduleCreateTransaction
│       ├── input.ts            # --scheduled / -X
│       ├── output.ts
│       ├── types.ts
│       └── index.ts
├── shared/
│   └── types.ts
└── index.ts                    # Plugin exports
```

## Commands

All commands return `CommandResult` with structured output in the `result` field. Errors are thrown as typed `CliError` instances and handled by the core framework.

### Schedule Create

Register a **named** schedule in local state (admin key, payer, memo, expiration, wait-for-expiry). This record is used when you pass `--scheduled` on a supported command.

```bash
hcli schedule create --name my-schedule --admin-key alice --payer-account alice

hcli schedule create --name my-schedule --memo "proposal vote" --expiration "2026-12-31T23:59:59.000+01:00"

hcli schedule create --name my-schedule --wait-for-expiry --key-manager local_encrypted
```

**Parameters:**

- `--name` / `-n`: Name of the schedule (local alias) — **Required**
- `--admin-key` / `-a`: Admin key for the schedule on chain (optional)
- `--payer-account` / `-p`: Payer account for the scheduled transaction; must resolve to an account with a private key; defaults to operator if omitted
- `--memo` / `-m`: Public schedule memo (max 100 bytes)
- `--expiration` / `-e`: Expiration time (ISO 8601; max 62 days from now)
- `--wait-for-expiry` / `-w`: Execute at expiration instead of when signatures are complete
- `--key-manager` / `-k`: `local` or `local_encrypted` (optional; defaults to config)

### Schedule Sign

Add a signature to an existing scheduled transaction (`ScheduleSignTransaction`).

```bash
hcli schedule sign --schedule my-schedule --key bob

hcli schedule sign --schedule 0.0.1234567 --key 0.0.111:302e020100300506032b657004220420...
```

**Parameters:**

- `--schedule` / `-s`: Schedule ID (`0.0.x`) or local schedule name — **Required**
- `--key` / `-k`: Key whose signature to add — **Required**
- `--key-manager` / `-K`: Key manager (optional; defaults to config)

### Schedule Delete

Delete a scheduled transaction on chain and optionally clear local state when applicable.

```bash
hcli schedule delete --schedule my-schedule --admin-key alice
```

**Parameters:**

- `--schedule` / `-s`: Schedule ID or local name — **Required**
- `--admin-key` / `-a`: Admin key to sign the delete (optional if stored in state)
- `--key-manager` / `-k`: Key manager (optional; defaults to config)

### Schedule Verify

Check execution state via the Mirror Node and optionally import or refresh schedule information in local state.

```bash
hcli schedule verify --name my-schedule

hcli schedule verify --schedule-id 0.0.1234567
```

**Parameters:**

- `--name` / `-n`: Local name of the schedule record (optional)
- `--schedule-id` / `-s`: Schedule ID `0.0.x` (optional)

At least one of `--name` or `--schedule-id` is required.

- `--key-manager` / `-k`: Key manager when resolving keys for display (optional; defaults to config)

## Usage: Scheduling Inner Transactions (`scheduled` Hook)

The `scheduled` hook wraps a supported command’s inner transaction in a `ScheduleCreateTransaction`, signs and submits it, then stores the returned schedule ID in local state.

Pass **`--scheduled <name>`** (short **`-X`**) where `<name>` matches a record created with `schedule create`. The inner command must register the hook (see below).

### Supported Commands

Commands that register the `scheduled` hook (alongside `batchify` where applicable):

- **Account**: `account create`
- **HBAR**: `hbar transfer`
- **Topic**: `topic create`, `topic submit-message`
- **Token**: `token mint-ft`, `token mint-nft`, `token transfer-ft`, `token transfer-nft`, `token create-ft`, `token create-nft`, `token associate`, `token create-ft-from-file`, `token create-nft-from-file`

### Example Workflow

```bash
# 1. Register schedule options in local state
hcli schedule create --name team-vote --admin-key alice --expiration "2026-06-01T12:00:00.000+02:00"

# 2. Run a command with --scheduled: inner tx becomes a ScheduleCreate, not an immediate execution
hcli token transfer-ft --token MYTOKEN --from alice --to bob --amount 10 --scheduled team-vote

# 3. Collect signatures from other keys as needed
hcli schedule sign --schedule team-vote --key carol

# 4. Verify on Mirror Node / refresh local flags
hcli schedule verify --name team-vote
```

**Hook option:**

- `--scheduled` / `-X`: Name of the schedule record in local state (must exist from `schedule create` and must not already have been used to create an on-chain schedule for that record in a way that conflicts with reuse rules).

**Note:** You cannot combine arbitrary flags in unsupported ways; follow each command’s own options. If neither `batchify` nor `scheduled` is used, the transaction executes immediately as usual.

## Core API Integration

The plugin uses Core API services such as:

- `api.state` — Namespaced persistence for schedule records
- `api.config` — Default key manager and options
- `api.network` — Current network for composite keys
- `api.keyResolver` — Resolve signing keys and account credentials
- `api.kms` — Key material access where applicable
- `api.txSign` / `api.txExecute` — Sign and execute transactions
- `api.schedule` — Build `ScheduleCreate`, `ScheduleSign`, `ScheduleDelete` transactions
- `api.mirror` — `getScheduled` for verify flow
- `api.logger` — Logging

## State Management

Schedule entries live under the namespace `schedule-transactions` (see `SCHEDULE_NAMESPACE` in `schema.ts`). Each entry is keyed by **network + schedule name** and validated with `ScheduledTransactionDataSchema`.

Relevant fields include: name, optional `scheduledId`, network, key manager, admin/payer references, memo, expiration (ISO string with offset where used), `waitForExpiry`, `scheduled` / `executed` flags, and optional `normalizedParams` from the command that produced the scheduled transaction.

## Hook Architecture

The `scheduled` hook is declared in the manifest. For commands that register it:

1. **`preSignTransactionHook`**: If `--scheduled` is set, loads the named record, builds a schedule-create transaction around the inner built transaction, merges required key refs (admin/payer), signs, executes, persists `scheduledId` and metadata, and returns `breakFlow: true` so the normal execute path does not run again.

If `--scheduled` is omitted, the hook no-ops and the transaction flow continues unchanged.

## Output Formatting

Each command defines a Zod schema in `output.ts` and a Handlebars template for human-readable output. Example **create**:

```
✅ Scheduled record created successfully
   Name: my-schedule
   ...
```

Example **scheduled** hook:

```
✅ Transaction scheduled successfully
   Schedule name: team-vote
   Schedule ID: ...
   Transaction ID: ...
```

Machine-readable output uses the CLI `--format` option (e.g. `json`) like other plugins.

## Testing

Unit tests for schedule commands and the `scheduled` hook can be added under `src/plugins/schedule/__tests__/` following the same patterns as other plugins (e.g. `batch`). Core mocks should include `api.schedule` and Mirror Node `getScheduled` where verify tests are concerned.
