### ADR-003: Result-Oriented Command Handler Contract and CLI Output Control

- Status: Proposed
- Date: 2025-10-17
- Owner: Tech Lead, Hiero CLI
- Related: `src/hiero-cli.ts`, `src/core/*`, `src/plugins/*`, `docs/adr/ADR-001-plugin-architecture.md`

## Context

The current CLI executes plugin command handlers that directly print output and determine process exit codes. Handlers may throw errors, write to stdout/stderr, and terminate execution implicitly via exceptions. This tight coupling between business logic, output formatting, and process lifecycle makes automation, scripting, and consistent UX harder.

We want to change the flow so that command handlers return a structured result object to the CLI. The CLI will be responsible for:

- Parsing/validating handler output against the command's schema declared in the plugin manifest
- Formatting output (human-readable via templates or default formatter; or machine-readable JSON/XML/YAML)
- Directing output to stdout or to a file
- Determining exit codes and final messages based on the handler's result
- Optionally suppressing handler logs in script mode while still allowing progress logs during interactive runs

This preserves plugin simplicity while centralizing I/O policy, error taxonomy, and exit-code semantics in the Core/CLI.

## Decision

Introduce a result-oriented contract for command handlers and shift output, validation, and exit-code responsibility to the CLI. Concretely:

- Handlers must return a `CommandExecutionResult` object with fields: `status`, `errorMessage?`, and `outputJson?` (string). The CLI interprets this result to decide exit code and output.
- Handlers may throw Core-named exceptions (well-known error taxonomy). The CLI will catch and handle these uniformly; plugins should not transform these.
- Handlers may log warnings/errors to stderr and optional progress/info logs to stdout/stderr during long-running operations. In script mode, the CLI will suppress handler logs.
- Each command definition in a plugin manifest declares an output schema and may provide a human-readable template. The CLI uses the schema to validate `outputJson` and the template (if present) to render human-readable output; otherwise the CLI uses a default formatter.
- The CLI provides switches to:
  - Choose output format: `--format human|json|yaml|xml` (default: `human`)
  - Save output to a file: `--output <path>`
  - Enable script mode (suppress handler logs): `--script`

## Specification

### Command Handler Result Type

```ts
import { Status } from '../shared/constants';

export interface CommandExecutionResult {
  status: Status;
  /** Optional, present when status !== Status.Success; intended for humans */
  errorMessage?: string;
  /** JSON string conforming to the manifest-declared output schema */
  outputJson?: string;
}
```

Notes:

- The `status` field uses the `Status` enum from `src/core/shared/constants.ts` for type safety and consistency.
- `outputJson` must be a JSON string; the CLI is the sole owner of parsing/validation/formatting.

### Plugin Manifest Additions

Extend `CommandSpec` with output metadata:

```ts
export interface CommandOutputSpec {
  /** Zod schema for the command's output */
  schema: z.ZodTypeAny;
  /** Optional human-readable Handlebars template string */
  humanTemplate?: string;
}

export interface CommandSpec {
  name: string;
  summary: string;
  description: string;
  options?: CommandOption[];
  handler: CommandHandler;
  /** Required: describes the handler's output */
  output: CommandOutputSpec;
}
```

Implementation: See `src/core/plugins/plugin.types.ts` for the current type definitions.

### Core Error Taxonomy

Define a named group of Core exceptions that handlers may throw directly, which the CLI will interpret and convert into consistent exit codes/messages. Examples include:

- `OperatorAccountMissingError`
- `NetworkNotConfiguredError`
- `InvalidProfileError`
- `PermissionDeniedError`

Plugins may throw these as-is. The CLI will map them to exit codes and user-friendly messages.

### CLI Responsibilities

- Load plugin manifests; when executing a command:
  1. Invoke the handler and await a `CommandExecutionResult`.
  2. If a Core-named exception is thrown, map to exit code and message; otherwise treat as unexpected failure (generic error).
  3. If `output.output.schema` exists:
     - Parse `result.outputJson` (if present) and validate against the schema (typewise). On validation failure, treat as handler failure with a distinct exit code.
  4. Render output according to `--format`:
     - `human`: if `humanTemplate` present, render via that template; else use a default formatter on the parsed JSON
     - `json|yaml|xml`: serialize the parsed JSON accordingly
  5. Write the rendered output to stdout or to the `--output` path if provided.
  6. Determine process exit code from `result.status` and/or exception mapping.
- Script mode (`--script`): suppress handler logs (stdout/stderr) during execution; only the CLI's final output is printed.

### Exit Code Policy

- 0 – Success (`status: Status.Success`)
- 1 – Handler-declared failure (`status: Status.Failure` or Core exception)

Exit codes within ranges may be refined later; the mapping lives centrally in Core/CLI.

## Rationale

- Separating concerns improves testability and scripting: handlers focus on domain work, the CLI standardizes output and exit semantics.
- Manifest-driven schemas enforce contract stability and enable tooling (validation, template authoring, typed SDKs).
- Script mode enables clean machine consumption in pipelines without plugin noise.
- A small, explicit set of Core exceptions keeps responsibility clear and UX consistent.

## Consequences

- Handlers must be updated to return `CommandExecutionResult` instead of printing final results.
- CLI must implement schema validation, template rendering, multi-format serialization, output redirection, and exit code mapping.
- Tests will shift: unit tests validate handler results; E2E tests assert CLI formatting and exit behavior.

## Implementation Notes

- Add types to `src/core/types` (or equivalent) for `CommandExecutionResult` using the `Status` enum.
- Extend plugin manifest types to include `CommandOutputSpec`.
- Update `src/hiero-cli.ts` execution path to:
  - Configure logging and script mode suppression
  - Execute handler, normalize exceptions, validate schema, render output, write to destination, set exit code
- Provide a default human-readable formatter (table/list) when no template is provided.
- Provide serializers for `json`, `yaml` (js-yaml), and `xml` (e.g., fast-xml-parser).
- Introduce a central error-to-exit-code map for Core exceptions.

## Alternatives Considered

- Keep handlers responsible for printing and exiting: rejected due to poor composability and inconsistent UX.
- Require handlers to always return typed objects (not JSON strings): deferred; JSON string preserves backward compatibility for plugin boundaries and avoids accidental type coercion.

## Testing Strategy

- Unit: handler returns and error taxonomy mapping.
- Unit: schema validation success/failure paths.
- Unit: formatters and serializers.
- E2E: `--format` variants, `--output` file writes, and `--script` suppression.
