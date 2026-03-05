### ADR-009: Class-Based Command Structure and Cross-Plugin Hook System

- Status: Proposed
- Date: 2026-03-05
- Related: `src/core/commands/command.ts`, `src/core/hooks/abstract-hook.ts`, `src/core/plugins/plugin-manager.ts`, `docs/adr/ADR-001-plugin-architecture.md`, `docs/adr/ADR-003-command-handler-result-contract.md`

## Context

Existing plugin commands are implemented as plain handler functions (`CommandHandler`) that receive `CommandHandlerArgs` and return `Promise<CommandResult>`. While straightforward, this approach conflates input validation, domain logic, and output formatting into a single function body. This makes it difficult to:

- Intercept or extend command behavior without modifying the handler itself.
- Test individual phases (validation, business logic, output) in isolation.
- Inject cross-cutting concerns (logging, auditing, authorization) from other plugins.

As the number of plugins grows, the need for a structured command lifecycle with well-defined extension points becomes critical.

## Decision

Introduce two complementary mechanisms:

1. **`BaseCommand`** -- an abstract class that decomposes command execution into discrete, testable phases with lifecycle hooks between them.
2. **`AbstractHook`** -- a hook base class whose instances can be registered in any plugin manifest and injected into any command's lifecycle, enabling cross-plugin extensibility.
3. **`HookResult`** -- a return type from hooks that enables flow control: any hook can halt command execution and return an early result.

### Part 1: BaseCommand

`BaseCommand<TNormalisedParams, TCoreActionResult>` (defined in `src/core/commands/command.ts`) implements the `Command` interface and provides a template-method `execute` orchestrator. Subclasses implement three abstract methods:

#### Full Implementation

```ts
// src/core/commands/command.ts
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AbstractHook } from '@/core/hooks/abstract-hook';
import type {
  HookResult,
  PostCoreActionParams,
  PostOutputPreparationParams,
  PreCoreActionParams,
} from '@/core/hooks/types';

export abstract class BaseCommand<
  TNormalisedParams = unknown,
  TCoreActionResult = unknown,
> implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const preNormalizationHookResult =
      await this.preParamsNormalizationHook(args);
    if (preNormalizationHookResult && preNormalizationHookResult.breakFlow) {
      return {
        result: preNormalizationHookResult.result,
        humanTemplate: preNormalizationHookResult.humanTemplate,
      };
    }

    const normalisedParams = await this.normalizeParams(args);

    const preCoreHookResult = await this.preCoreActionHook(args, {
      normalisedParams,
    });
    if (preCoreHookResult && preCoreHookResult.breakFlow) {
      return {
        result: preCoreHookResult.result,
        humanTemplate: preCoreHookResult.humanTemplate,
      };
    }

    const coreActionResult = await this.coreAction(args, normalisedParams);

    const postCoreHookResult = await this.postCoreActionHook(args, {
      normalisedParams,
      coreActionResult,
    });
    if (postCoreHookResult && postCoreHookResult.breakFlow) {
      return {
        result: postCoreHookResult.result,
        humanTemplate: postCoreHookResult.humanTemplate,
      };
    }

    const result = await this.outputPreparation(
      args,
      normalisedParams,
      coreActionResult,
    );

    const postOutputHookResult = await this.postOutputPreparationHook(args, {
      normalisedParams,
      coreActionResult,
      outputResult: result,
    });
    if (postOutputHookResult && postOutputHookResult.breakFlow) {
      return {
        result: postOutputHookResult.result,
        humanTemplate: postOutputHookResult.humanTemplate,
      };
    }

    return result;
  }

  async preParamsNormalizationHook(
    args: CommandHandlerArgs,
  ): Promise<HookResult | undefined> {
    return await this.executeHooks(
      async (h) => h.preParamsPreparationAndNormalizationHook(args),
      args.hooks,
    );
  }

  async preCoreActionHook(
    args: CommandHandlerArgs,
    params: PreCoreActionParams<TNormalisedParams>,
  ): Promise<HookResult | undefined> {
    return await this.executeHooks(
      async (h) => h.preCoreActionHook(args, params),
      args.hooks,
    );
  }

  async postCoreActionHook(
    args: CommandHandlerArgs,
    params: PostCoreActionParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<HookResult | undefined> {
    return await this.executeHooks(
      async (h) => h.postCoreActionHook(args, params),
      args.hooks,
    );
  }

  async postOutputPreparationHook(
    args: CommandHandlerArgs,
    params: PostOutputPreparationParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<HookResult | undefined> {
    return await this.executeHooks(
      async (h) => h.postOutputPreparationHook(args, params),
      args.hooks,
    );
  }

  protected async executeHooks(
    hookExecutor: (hook: AbstractHook) => Promise<HookResult | undefined>,
    hooks?: AbstractHook[],
  ): Promise<HookResult | undefined> {
    if (!hooks) return undefined;
    for (const hook of hooks) {
      const hookResult = await hookExecutor(hook);
      if (hookResult && hookResult.breakFlow) {
        return hookResult;
      }
    }
    return undefined;
  }

  abstract normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TNormalisedParams>;

  abstract coreAction(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
  ): Promise<TCoreActionResult>;

  abstract outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
    coreActionResult?: TCoreActionResult,
  ): Promise<CommandResult>;
}
```

| Method                                                         | Responsibility                                                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `normalizeParams(args)`                                        | Validate and transform raw CLI arguments into a strongly-typed params object (`TNormalisedParams`). Typically uses a Zod schema. |
| `coreAction(args, normalisedParams)`                           | Execute domain logic: network calls, state mutations, transaction signing.                                                       |
| `outputPreparation(args, normalisedParams, coreActionResult?)` | Map the domain result into a `CommandResult` for the CLI output pipeline.                                                        |

Each hook point checks the returned `HookResult` -- if `breakFlow` is `true`, execution stops immediately and the hook's result is returned as the command output.

#### Registration

A `BaseCommand` instance is registered on the `command` field of `CommandSpec` in the plugin manifest. When `PluginManager` executes a command:

- If `commandSpec.command` is present, it calls `command.execute(handlerArgs)`.
- Otherwise, it falls back to the legacy `commandSpec.handler(handlerArgs)` function.

This makes adoption incremental -- existing handler functions continue to work unchanged.

```ts
// In plugin manifest (CommandSpec)
{
  name: 'foo',
  summary: 'Run foo',
  description: 'Execute the foo command',
  command: new FooTestCommand(),   // <-- BaseCommand instance
  handler: fooTestOptions,         // <-- legacy fallback
  output: { schema: FooTestOutputSchema, humanTemplate: FOO_TEMPLATE },
}
```

#### Example: FooTestCommand

```ts
import type { CommandHandlerArgs, CommandResult } from '@/core';
import { BaseCommand } from '@/core/commands/command';

interface FooNormalizedParams {
  message: string;
}

export class FooTestCommand extends BaseCommand<FooNormalizedParams, void> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<FooNormalizedParams> {
    const validArgs = FooTestInputSchema.parse(args.args);
    return { message: validArgs.message };
  }

  async coreAction(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
  ): Promise<void> {
    args.logger.info(normalisedParams.message);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
  ): Promise<CommandResult> {
    return { result: { bar: normalisedParams.message } };
  }
}
```

### Part 2: Hook System

`AbstractHook` (defined in `src/core/hooks/abstract-hook.ts`) provides four no-op lifecycle methods at the key points of the command execution pipeline. Each method returns `Promise<HookResult | undefined>`, enabling hooks to optionally halt the execution flow.

#### Full Implementation

```ts
// src/core/hooks/abstract-hook.ts
import type { CommandHandlerArgs } from '@/core';
import type {
  HookResult,
  PostCoreActionParams,
  PostOutputPreparationParams,
  PreCoreActionParams,
} from '@/core/hooks/types';

export abstract class AbstractHook {
  public preParamsPreparationAndNormalizationHook(
    _args: CommandHandlerArgs,
  ): Promise<HookResult | undefined> {
    void _args;
    return Promise.resolve({
      breakFlow: false,
      result: { message: 'success' },
    });
  }

  public preCoreActionHook(
    _args: CommandHandlerArgs,
    _params: PreCoreActionParams,
  ): Promise<HookResult | undefined> {
    void _args;
    void _params;
    return Promise.resolve({
      breakFlow: false,
      result: { message: 'success' },
    });
  }

  public postCoreActionHook(
    _args: CommandHandlerArgs,
    _params: PostCoreActionParams,
  ): Promise<HookResult | undefined> {
    void _args;
    void _params;
    return Promise.resolve({
      breakFlow: false,
      result: { message: 'success' },
    });
  }

  public postOutputPreparationHook(
    _args: CommandHandlerArgs,
    _params: PostOutputPreparationParams,
  ): Promise<HookResult | undefined> {
    void _args;
    void _params;
    return Promise.resolve({
      breakFlow: false,
      result: { message: 'success' },
    });
  }
}
```

#### Hook Lifecycle Methods

| Hook                                       | Fires                     | Receives                                                       |
| ------------------------------------------ | ------------------------- | -------------------------------------------------------------- |
| `preParamsPreparationAndNormalizationHook` | Before `normalizeParams`  | `args`                                                         |
| `preCoreActionHook`                        | Before `coreAction`       | `args`, `{ normalisedParams }`                                 |
| `postCoreActionHook`                       | After `coreAction`        | `args`, `{ normalisedParams, coreActionResult }`               |
| `postOutputPreparationHook`                | After `outputPreparation` | `args`, `{ normalisedParams, coreActionResult, outputResult }` |

Concrete hooks extend `AbstractHook` and override only the methods they need.

### Part 3: HookResult and Flow Control

Each hook returns `Promise<HookResult | undefined>`. The `HookResult` interface:

```ts
export interface HookResult {
  breakFlow: boolean;
  result: object;
  humanTemplate?: string;
}
```

| Field           | Purpose                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `breakFlow`     | When `true`, command execution stops immediately. The hook's `result` and optional `humanTemplate` are returned as the `CommandResult`. |
| `result`        | The output object to use if `breakFlow` is `true`.                                                                                      |
| `humanTemplate` | Optional Handlebars template override for the output.                                                                                   |

The `CommandResult` type supports the optional `humanTemplate` field:

```ts
export interface CommandResult {
  result: object;
  humanTemplate?: string;
}
```

When `PluginManager` renders output, it prefers `result.humanTemplate` (if set by a hook) over the command's default template from the manifest.

**Flow control evaluation** happens in `executeHooks`: hooks are executed sequentially, and the loop terminates as soon as any hook returns `{ breakFlow: true, ... }`. The default base-class implementations return `{ breakFlow: false, result: { message: 'success' } }`, allowing execution to continue.

#### Hook Registration

Hooks are registered via `HookSpec` in a plugin's manifest:

```ts
export interface HookSpec {
  name: string;
  relevantCommands: string[]; // e.g. ["topic_submit-message", "contract_deploy"]
  hook: AbstractHook;
}
```

The `relevantCommands` array uses the format `${pluginName}_${commandName}` to target specific commands. A hook registered in plugin A can target commands in plugin B -- this is the core cross-plugin extensibility mechanism.

#### Hook Delivery

Hooks are passed to commands via the `hooks` field on `CommandHandlerArgs`:

```ts
export interface CommandHandlerArgs {
  args: Record<string, unknown>;
  api: CoreApi;
  state: StateManager;
  config: ConfigView;
  logger: Logger;
  hooks?: AbstractHook[];
}
```

During `PluginManager.registerCommands`, all `HookSpec` entries from every loaded plugin are collected into a single list:

```ts
this.hooks = Array.from(this.loadedPlugins.values()).flatMap(
  (plugin) => plugin.manifest.hooks ?? [],
);
```

When a command is executed, `filterHooksForCommand` selects the relevant hooks and injects them into `handlerArgs.hooks`:

```ts
private filterHooksForCommand(
  plugin: LoadedPlugin,
  commandSpec: CommandSpec,
): AbstractHook[] {
  const commandKey = `${plugin.manifest.name}_${commandSpec.name}`;
  return this.hooks
    .filter((spec) => spec.relevantCommands.includes(commandKey))
    .map((spec) => spec.hook);
}
```

#### Example: MessageLoggerHook

A hook defined in the topic plugin that logs the `message` parameter before the core action:

```ts
import type { CommandHandlerArgs } from '@/core';
import type { HookResult, PreCoreActionParams } from '@/core/hooks/types';
import { AbstractHook } from '@/core/hooks/abstract-hook';

export class MessageLoggerHook extends AbstractHook {
  override preCoreActionHook(
    args: CommandHandlerArgs,
    params: PreCoreActionParams,
  ): Promise<HookResult | undefined> {
    const { logger } = args;
    const { normalisedParams } = params;

    if (!normalisedParams || typeof normalisedParams !== 'object') {
      return Promise.resolve(undefined);
    }

    const message = (normalisedParams as Record<string, unknown>).message;
    if (typeof message === 'string') {
      logger.error(`${MessageLoggerHook.name}: ${message}`);
    }

    return Promise.resolve(undefined);
  }
}
```

Registered in the topic plugin manifest to target the `test_foo` command:

```ts
export const topicPluginManifest: PluginManifest = {
  name: 'topic',
  // ...
  hooks: [
    {
      name: 'message-logger',
      relevantCommands: ['test_foo'],
      hook: new MessageLoggerHook(),
    },
  ],
};
```

This demonstrates a hook in the **topic** plugin intercepting a command in the **test** plugin.

#### Example: Authorization Hook with breakFlow

A hook that halts execution if the user lacks permission:

```ts
export class AuthorizationHook extends AbstractHook {
  override preCoreActionHook(
    args: CommandHandlerArgs,
    params: PreCoreActionParams,
  ): Promise<HookResult | undefined> {
    const isAuthorized = checkPermissions(args);

    if (!isAuthorized) {
      return Promise.resolve({
        breakFlow: true,
        result: { error: 'Insufficient permissions' },
        humanTemplate: 'Access denied: {{error}}',
      });
    }

    return Promise.resolve(undefined);
  }
}
```

When `breakFlow: true` is returned, `BaseCommand.execute` immediately returns the hook's result as the command output, skipping `coreAction`, `outputPreparation`, and all subsequent hooks.

## Execution Flow

```mermaid
sequenceDiagram
    participant PM as PluginManager
    participant BC as BaseCommand
    participant H as Hooks
    participant Sub as Subclass

    PM->>BC: execute(args)

    BC->>H: preParamsPreparationAndNormalizationHook(args)
    H-->>BC: HookResult?
    alt breakFlow = true
        BC-->>PM: HookResult as CommandResult
    end

    BC->>Sub: normalizeParams(args)
    Sub-->>BC: normalisedParams

    BC->>H: preCoreActionHook(args, normalisedParams)
    H-->>BC: HookResult?
    alt breakFlow = true
        BC-->>PM: HookResult as CommandResult
    end

    BC->>Sub: coreAction(args, normalisedParams)
    Sub-->>BC: coreActionResult

    BC->>H: postCoreActionHook(args, normalisedParams, coreActionResult)
    H-->>BC: HookResult?
    alt breakFlow = true
        BC-->>PM: HookResult as CommandResult
    end

    BC->>Sub: outputPreparation(args, normalisedParams, coreActionResult)
    Sub-->>BC: CommandResult

    BC->>H: postOutputPreparationHook(args, normalisedParams, coreActionResult, outputResult)
    H-->>BC: HookResult?
    alt breakFlow = true
        BC-->>PM: HookResult as CommandResult
    end

    BC-->>PM: CommandResult
```

## Pros and Cons

### Pros

- **Cross-plugin extensibility.** Hooks registered in one plugin can intercept commands in a completely different plugin. This enables cross-cutting concerns (auditing, authorization, telemetry) without modifying the target command.
- **Separation of concerns.** Validation (`normalizeParams`), domain logic (`coreAction`), and output formatting (`outputPreparation`) are isolated in dedicated methods, making each easier to understand and maintain.
- **Flow control via hooks.** Any hook can halt command execution by returning `{ breakFlow: true }` with a custom result. This enables use cases like authorization gates, rate limiting, or conditional command skipping -- all without modifying the command itself.
- **Testability.** Each phase can be unit-tested independently. Hooks can be tested in isolation by invoking them directly with mock args and params.
- **Incremental adoption.** The `command` field on `CommandSpec` is optional. Existing plain handler functions continue to work, so migration can happen command-by-command.
- **Open/Closed principle.** New behavior can be added to existing commands via hooks without modifying the command's source code.

### Cons

- **Additional boilerplate.** A `BaseCommand` subclass requires implementing three methods, type parameters, and separate files for normalized params and output types -- noticeably more code than a plain handler function for simple commands.
- **Learning curve.** Developers must understand the lifecycle phases, hook ordering, the `HookResult` contract, and how `HookSpec.relevantCommands` matching works.
- **Sequential hook execution overhead.** Hooks are executed sequentially with `await`. A slow hook blocks subsequent hooks and the command phase it precedes. There is no parallel execution or timeout mechanism.
- **Debugging complexity.** When multiple hooks from different plugins interact with the same command, tracing the execution flow and diagnosing issues requires understanding the full hook chain, which is assembled at runtime. The `breakFlow` mechanism adds another dimension -- a hook may silently prevent execution of later hooks and the command itself.
- **No hook ordering guarantees.** Hook execution order depends on plugin loading order, which may vary. There is currently no priority or explicit ordering mechanism.

## Consequences

- New commands should prefer `BaseCommand` over plain handler functions when they involve distinct validation, domain, and output phases, or when hook extensibility is needed.
- Plugins that need to inject cross-cutting behavior into other plugins' commands should define `HookSpec` entries in their manifest.
- Hook authors must handle errors defensively -- an unhandled exception in a hook will propagate and abort the command execution.
- Hooks that use `breakFlow: true` should provide meaningful `result` and optionally `humanTemplate` values, as these become the command's output.
- The `CommandResult.humanTemplate` field allows hooks to override the output template defined in the command manifest, giving hooks full control over the user-facing output when they halt execution.

## Testing Strategy

- **Unit: BaseCommand subclass.** Test each abstract method independently by instantiating the subclass and calling `normalizeParams`, `coreAction`, and `outputPreparation` with mock args.
- **Unit: Hook execution.** Verify that `executeHooks` calls each hook in order, returns `undefined` when no hook breaks flow, and returns the `HookResult` immediately when a hook sets `breakFlow: true`.
- **Unit: Flow interruption.** Verify that when a hook returns `breakFlow: true`, subsequent hooks are not called and the command phases after the hook point are skipped.
- **Unit: Hook filtering.** Test `filterHooksForCommand` with various `relevantCommands` patterns to ensure correct matching.
- **Unit: Individual hooks.** Instantiate a concrete hook and invoke its lifecycle method with mock args/params. Assert the expected side effects and `HookResult` values.
- **Integration: Cross-plugin hooks.** Load two plugins where one declares a hook targeting the other's command. Execute the command and verify the hook fires.
- **Integration: Legacy fallback.** Ensure commands without a `command` field still execute via the plain `handler` function.
