### ADR-005: CLI Initialization Wizard and Interactive Prompting

- Status: Proposed
- Date: 2025-12-15
- Related: `src/hedera-cli.ts`, `src/core/services/prompt/*`, `src/core/services/setup/*`

## Context

The CLI currently requires manual operator configuration via explicit commands (`hiero network set-operator`). This creates friction for new users who must:

1. Understand the operator concept before executing any command
2. Manually construct and execute configuration commands

This ADR proposes an interactive initialization wizard that guides users through operator setup when none is configured, reducing onboarding friction while maintaining compatibility with automated/scripted usage.

**Goals:**

- Reduce new user onboarding time from minutes to seconds
- Provide immediate, actionable feedback on input validation
- Maintain clear separation of concerns (UI vs business logic vs persistence)
- Support both human-interactive and machine-readable (JSON) output modes
- Establish reusable prompting infrastructure for future interactive features

**Non-goals (v1):**

- Multi-step configuration wizards beyond operator setup
- Configuration migration or editing existing operators
- Network selection during initialization (uses current network)

## Decision

We will implement two new services to provide interactive operator initialization:

### 1. PromptService

**Responsibility:** Presentation layer - collect user input through interactive prompts.

**Implementation:**

- Thin wrapper around [@clack/prompts](https://github.com/natemoo-re/clack) library
- Provides type-safe prompting methods: `collectSetupData()`, `confirm()`
- Zero business logic - purely UI concerns
- Handles user cancellation (Ctrl+C) gracefully

**Rationale for @clack/prompts:**

- Modern, minimal design consistent with contemporary CLI UX
- Active maintenance and stable API (v0.11.0)
- Zero native dependencies (pure Node.js)
- Built-in support for text input, password masking, select menus
- Used by established tools (create-t3-app, create-svelte)

### 2. SetupService

**Responsibility:** Orchestration - coordinate setup flow, validation, and persistence.

**Implementation:**

- Depends on: PromptService (UI), NetworkService (persistence), OutputService (format detection)
- Validates input format (AccountId regex, PrivateKey format) using existing schemas
- Validates import (AccountId ↔ PrivateKey match via MirrorNode public key lookup)
- Persists configuration via NetworkService.setOperator() and ConfigService
- Guards against execution in JSON mode (see Decision 2)

**Why separation?**

- **Single Responsibility Principle**: PromptService handles UI, SetupService handles business logic
- **Testability**: Mock PromptService to test SetupService orchestration without terminal I/O
- **Reusability**: PromptService.confirm() can be used elsewhere (e.g., transaction confirmation for self-transfers)
- **Maintenance**: UI library changes (clack) isolated to one service

## Key Decisions

### Decision 1: When Does Initialization Execute?

**CHOSEN: Always on startup (except --help/--version)**

Setup wizard runs before any command execution if `NetworkService.getOperator()` returns null for the current network.

**Rationale:**

- **Explicit Contract**: Every command (except meta-commands) operates with a known operator context
- **Fail Fast**: Missing operator detected immediately, not mid-command execution
- **Predictable State**: Commands can assume operator exists, simplifying handler logic
- **Future Flexibility**: Establishes pattern for other required setup (e.g., network health check)

**Alternatives Considered:**

1. **Lazy initialization (only when command requires operator)**

   - _Rejected_: Requires each command to declare operator dependency and handle missing state
   - _Complexity_: Commands like `account balance` could technically work without operator (query-only), but this creates inconsistent UX and complicates validation
   - _Maintenance burden_: Every new command must implement operator-required logic

2. **One-time setup (store "setup completed" flag)**

   - _Rejected_: Flag becomes stale when user deletes operator or switches networks
   - _Extra state_: Requires tracking completion per network, adding unnecessary complexity
   - _Edge cases_: What if setup fails halfway? When to reset flag?

3. **Explicit `hiero init` command**
   - _Rejected_: Users forget to run it, leading to cryptic errors on first real command
   - _Documentation burden_: Every tutorial must say "run init first"
   - _Onboarding friction_: Extra step before value delivery

### Decision 2: JSON Mode Disables Interactive Wizards

**CHOSEN: Interactive prompts disabled when `--format json` is set**

When `OutputService.getFormat() === 'json'`:

- Setup wizard throws error with manual configuration instructions
- Error message includes exact command to configure operator
- Exit code indicates configuration issue

**Rationale:**

- **Automation Compatibility**: JSON mode signals non-interactive context (CI/CD, scripts, pipeline)
- **Clear Contract**: JSON format = machine-readable output = no stdin input expected
- **Fail Safe**: Better to fail fast with clear error than hang waiting for input that never comes
- **Explicit Configuration**: Automated contexts should use explicit config (env vars, config files, CLI flags)

**Example Error Message:**

```
Error: No operator configured. In JSON mode, configure operator manually:
  hiero network set-operator --operator <Alias or AccountId:PrivateKey>
Or run in interactive mode without --format json
```

**Alternatives Considered:**

1. **Allow interactive prompts in JSON mode**

   - _Rejected_: Breaks stdin/stdout separation in scripts
   - _Deadlock risk_: Script hangs indefinitely waiting for input
   - _Mixing concerns_: Mixing structured JSON output with interactive prompts corrupts parsers

2. **Automatically disable prompts in non-TTY contexts**

   - _Rejected_: `--format json` is more explicit than TTY detection
   - _False positives_: Some CI environments provide TTY (GitHub Actions)
   - _User control_: Let users explicitly signal intent via format flag

3. **Separate `--interactive` flag**
   - _Rejected_: Redundant with `--format` flag
   - _Complexity_: More flags = more combinations to test and document
   - _Implicit coupling_: Format already implies interactivity model

## Data Flow

```
1. CLI Startup (hedera-cli.ts)
   ↓
2. Parse --format flag → OutputService.setFormat()
   ↓
3. SetupService.needsSetup()
   ├─ false → Continue to command execution
   └─ true → SetupService.runInitialSetup()
             ↓
             Check OutputService.getFormat()
             ├─ 'json' → throw Error (no operator in JSON mode)
             └─ 'human' → PromptService.collectSetupData()
                          ↓
                          Validate format (AccountIdWithPrivateKeySchema split)
                          ↓
                          Validate import (MirrorNode public key lookup)
                          ↓
                          Persist via NetworkService.setOperator()
                          ↓
                          Persist KeyManager via ConfigService
                          ↓
                          Continue to command execution
```

## Validation Strategy

### Format Validation

- Reuse existing `AccountIdWithPrivateKeySchema` (split into separate AccountId/PrivateKey validators)
- Validates AccountId format: `0.0.XXX` or `X.X.X`
- Validates PrivateKey format: ED25519 or ECDSA hex/DER encoding
- Immediate feedback during prompts (invalid format → re-prompt)

### Import Validation

- Fetch public key for AccountId from MirrorNode API
- Derive public key from user-provided PrivateKey
- Compare public keys (must match)
- On mismatch: Clear error message with remediation steps

### KeyManager Validation

- Limited to `local` and `local_encrypted` in v1
- Select menu with recommended option (local_encrypted)
- Persisted via ConfigService (not NetworkService)

## Persistence

Setup wizard does not implement its own persistence. It delegates to existing services:

**Operator (AccountId + PrivateKey):**

- Stored via `NetworkService.setOperator(accountId, privateKeyRefId)`
- Persisted per network in existing state structure

**KeyManager:**

- Stored via `ConfigService` (global setting)
- Survives network switches

**Why this matters:**

- No new persistence layer → less surface area for bugs
- Reuses tested, working storage mechanisms
- Consistent with manual `set-operator` command behavior

## Testing Strategy

- **PromptService**: Mock clack library, verify correct prompts shown and data collected
- **SetupService**: Mock PromptService, NetworkService, OutputService; verify orchestration logic
- **Integration**: Test full flow in human and JSON modes with valid/invalid inputs
- **Error handling**: Verify behavior when MirrorNode API fails, user cancels, invalid format
- **Cross-platform**: Verify clack rendering on Windows/macOS/Linux terminals

## Consequences

**Positive:**

- **Onboarding friction reduced**: New users guided through setup in < 30 seconds
- **Error prevention**: Real-time validation prevents invalid configurations from persisting
- **Consistent UX**: Clack provides modern, polished prompts matching contemporary CLI tools
- **Automation-safe**: JSON mode remains fully scriptable without interactive surprises
- **Reusable infrastructure**: PromptService enables future interactive features (e.g., transaction confirmation)
- **Clean separation**: UI and business logic decoupled for easy testing and maintenance

**Negative:**

- **New dependency**: @clack/prompts adds ~50KB to bundle (acceptable for UX improvement)
- **JSON mode inflexibility**: Users in non-interactive contexts must configure manually (by design)

**Trade-offs:**

- Wizard simplicity vs. configurability: v1 wizard is opinionated (no network selection, limited key managers) to reduce complexity. Future iterations can add options based on user feedback.
- Automatic setup vs. explicit control: Always-on wizard may surprise advanced users. Future: `HIERO_SKIP_SETUP=1` env var for power users.

## References

- [@clack/prompts GitHub](https://github.com/natemoo-re/clack)
- Prototype implementation: commit `a1754482`
- Related: ADR-004 (Key Protection Mechanism)
