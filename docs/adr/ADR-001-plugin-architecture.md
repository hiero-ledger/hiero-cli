### ADR-001: Extensible Plugin Architecture for Hiero CLI

- Status: Proposed
- Date: 2025-09-18
- Owner: Tech Lead, Hiero CLI
- Related: `src/api/*`, `src/commands/*`, `src/state/*`, `src/utils/*`

## Context

We want a stable Core that others can build on, enabling a plugin ecosystem without forks while keeping the CLI reliable and secure.

Goals:

- Stable Core API wrapping Hedera operations (`src/api/*`)
- Plugins that extend CLI functionality via commands
- Deterministic behavior across profiles/networks with strong testability

Non-goals (v1):

- Full sandboxing/process isolation
- Hot-reload of plugins

## Decision

- Establish a Core surface (types + runtime contracts):
  - Core HederaAPI (thin, typed wrapper over Hedera SDK)
  - Plugin runtime contracts (loader/DI/capability gating – DI at handler time)
  - State manager access (namespaced, versioned; Core-managed persistence)
  - Config facades
- Plugins are Node packages publishing a manifest and command handlers.
- Plugins are functionally stateless; persistence (if any) is declared via schemas and stored by Core under a namespace.
- Plugins export commands via a manifest; CLI loads manifests, registers commands, and injects Core services into handlers.

## Rationale

- Stateless-by-default plugins simplify testing, upgrades, and reduce corruption risk.
- Manifest-driven command registration enables conflict detection, help generation, and telemetry consistency.
- Dependency injection allows per-execution context (profile, tracing, rate limiting) and least-privilege access.

## Architecture Sketch

- `@hedera/cli` (binary): boot, config/profile, plugin discovery, command registry
- `@hedera/cli-core` (types/runtime contracts):
  - Types for `PluginManifest`, `CommandSpec`, `CommandHandlerArgs`
  - Loader responsibilities: discovery, validation, capability gating, lifecycle (`init/teardown`)

### Plugin Interface (types-only)

```ts
export interface PluginManifest {
  name: string;
  version: string;
  displayName: string;
  description: string;
  commands: CommandSpec[];
}

export interface CommandSpec {
  name: string;
  summary: string;
  description: string;
  options?: CommandOption[];
  handler: CommandHandler;
  output: CommandOutputSpec;
}

export interface CommandOption {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  default?: unknown;
  description?: string;
  short?: string; // optional short flag alias like 'b' for -b
}

export interface CommandOutputSpec {
  schema: z.ZodTypeAny; // Zod schema for the command's output
  humanTemplate?: string; // Optional human-readable Handlebars template string
}

export type CommandHandler = (
  args: CommandHandlerArgs,
) => Promise<CommandExecutionResult>;

export interface CommandExecutionResult {
  status: Status;
  errorMessage?: string; // Optional, present when status !== 'success'
  outputJson?: string; // JSON string conforming to the manifest-declared output schema
}

export interface CommandHandlerArgs {
  args: Record<string, unknown>;
  api: CoreApi; // injected instance per execution
  state: StateService; // namespaced access provided by Core
  config: ConfigService;
  logger: Logger;
}

export interface PluginContext {
  api: CoreApi; // injected instance for plugin lifecycle
  state: StateService; // namespaced access provided by Core
  config: ConfigService;
  logger: Logger;
}
```

## Key Policies

- Plugins import Core types only and receive instances via handler args (DI). They do not construct or import runtime singletons.
- Command conflicts resolved by namespacing; canonical id `pluginName:cmd`. Commands are called as `<pluginName> <cmd>` (e.g., `myplugin create`). Names allowed if conflict-free.
- Command handlers are functions that receive Core API services via dependency injection and return structured results.
- Error taxonomy standardized with exit codes for consistent UX and automation.

## Versioning

- SemVer for CLI and Core.
- Deprecations are warned and removed after two minor versions or 6 months (whichever later).

## Distribution & UX

- Plugins are npm packages (e.g., `@hiero-ledger/hiero-cli-plugin-*`).
- CLI provides `plugin list|add|remove|info|doctor` for management and diagnostics.
- Versions can be locked in a CLI lock to ensure reproducibility (future enhancement).

## Testing

- Provide `@hedera/cli-core/testing` mocks for `api/state/signer`.
- Expect unit tests with mocks and a happy-path integration suite against localnet.
- Plugin lifecycle methods should be testable in isolation with mocked context objects.

## Decisions to confirm

- ESM-first plugins targeting Node 22 LTS (support Node 20 for now)
- Per-profile default scoping for plugin state and config views
- Canonical command id format and help aliasing

## Consequences

- Slightly higher initial complexity (loader/DI), but improved extensibility and safety.
- Enables gradual migration of built-in commands into first-party plugins.
