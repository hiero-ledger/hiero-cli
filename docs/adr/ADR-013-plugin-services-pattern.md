# ADR-013: Plugin Services Pattern

**Status:** Proposed
**Scope:** Convention for reusable, plugin-specific logic.

---

## Context

The codebase lacks a single convention for plugin-internal logic that depends on Core services. Three distinct patterns are currently used interchangeably under `utils/`:

| Pattern                           | Example                                                   | Problem                                             |
| --------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| Function accepting `api: CoreApi` | `token-associations.ts` accepts `CoreApi`                 | Passes a god-object; dependencies are not explicit. |
| Function accepting a service list | `token-key-resolver.ts` accepts `keyResolver, keyManager` | Signature grows unmanageable at 4–5 dependencies.   |
| Pure function without DI          | `token-data-builders.ts`                                  | Acceptable; **retained as-is**.                     |

In addition, the codebase contains `Zustand*StateHelper` (across seven plugins) along with `AccountHelper`, `TopicHelper`, `ContractHelper`, and `ScheduleHelper` — classes that use dependency injection but lack interfaces and a consistent location. The `Helper` suffix is imprecise and conflates unrelated responsibilities.

### Why this is a problem

1. **Improvisation.** A developer encountering three patterns under `utils/` tends to copy whichever they see first. As a result, code review is inconsistent.
2. **No designated location for plugin-internal logic with dependencies.** `utils/` is reserved for pure functions, and Core is intentionally generic. There is no clear home for plugin-specific logic that consumes Core services.
3. **Tests are heavyweight.** A function such as `processTokenAssociations(api: CoreApi, ...)` requires a complete `CoreApi` mock. Any change to its implementation forces updates to `makeApiMock` across command tests.
4. **`Helper` is a poor name.** `AccountHelper`, for instance, simultaneously performs state cleanup, alias resolution, and KMS cleanup, with no clear single responsibility.

---

## Decision

**Adopt a single pattern: Plugin Service.**

- Plugin-internal logic that depends on Core services is implemented as a **class with an interface**, located at `plugins/<x>/services/<name>.service.ts`.
- Logic without side effects remains a **pure function** at `plugins/<x>/utils/<name>.ts`.
- Plugin service instances are constructed **fresh on each invocation**, inside the wrapper function within the command handler.
- The `Helper` suffix is eliminated from naming. Core and plugin services are distinguished by location rather than by name.

---

## Directory Convention

```
plugins/<x>/
├── commands/
├── services/
│   ├── token-state.service.interface.ts
│   ├── token-state.service.ts
│   └── ...
├── utils/                    ← pure functions only
│   └── token-data-builders.ts
└── (existing: handler.ts, manifest.ts, ...)
```

---

## Pattern: Plugin Service

A plugin service consists of an interface and an implementation. `KeyManager` (and every Core service) is injected through the constructor and never passed as a method parameter.

### Example: migrating a `utils/*.ts` module that uses DI

**Before:** `plugins/token/utils/token-associations.ts`

```typescript
export async function processTokenAssociations(
  tokenId: string, associations: Credential[], api: CoreApi, logger: Logger, keyManager: KeyManager,
): Promise<...> { ... }
```

**After:** `plugins/token/services/token-associations.service.interface.ts`

```typescript
export interface TokenAssociationsService {
  processAssociations(tokenId: string, associations: Credential[]): Promise<...>;
}
```

**After:** `plugins/token/services/token-associations.service.ts`

```typescript
export class TokenAssociationsService implements TokenAssociationsService {
  constructor(
    private readonly keyResolver: KeyResolverService,
    private readonly tokenSdk: TokenService,
    private readonly txSign: TxSignService,
    private readonly txExecute: TxExecuteService,
    private readonly state: TokenStateService,
    private readonly keyManager: KeyManager,
    private readonly logger: Logger,
  ) {}

  async processAssociations(tokenId: string, associations: Credential[]): Promise<...> {
    for (const association of associations) {
      const account = await this.keyResolver.resolveAccountCredentials(
        association, this.keyManager, false, ['token:associate'],
      );
      const tx = this.tokenSdk.createTokenAssociationTransaction({ tokenId, accountId: account.accountId });
      const signed = await this.txSign.sign(tx, [account.keyRefId]);
      await this.txExecute.execute(signed);
    }
  }
}
```

**Rules:** the constructor accepts only concrete Core services (never `CoreApi`); all fields are declared `private readonly`; the interface is defined in a separate file.

---

## Pattern: Wrapper Function (wiring point)

The wrapper function is the single location within a plugin where `args.api` is consumed in order to construct plugin services.

```typescript
// plugins/token/commands/wipe-ft/handler.ts
export class TokenWipeFtCommand extends BaseTransactionCommand<...> {
  constructor(
    private readonly keys: TokenKeysService,
    private readonly state: TokenStateService,
    private readonly associations: TokenAssociationsService,
  ) { super('wipe-ft'); }

  protected async normalizeParams(args: CommandHandlerArgs) {
    const tokenData = this.state.getToken(...);
    const resolvedKeys = await this.keys.resolveOptionalKeys(...);
    return { tokenData, resolvedKeys, ... };
  }

  protected async buildTransaction(args: CommandHandlerArgs, params) {
    return { transaction: args.api.token.createWipeFtTransaction(... ) };
  }
  // signTransaction and executeTransaction rely on args.api.txSign and args.api.txExecute.
}

export async function tokenWipeFt(args: CommandHandlerArgs): Promise<CommandResult> {
  const { api } = args;
  const keys = new TokenKeysService(api.keyResolver, api.kms, api.logger);
  const state = new TokenStateService(api.state, api.logger);
  const associations = new TokenAssociationsService(
    api.keyResolver, api.token, api.txSign, api.txExecute, state, api.keyManager, api.logger,
  );
  return new TokenWipeFtCommand(keys, state, associations).execute(args);
}
```

**Mental model:** `this.X` denotes plugin services; `args.api.X` denotes Core services.

**Decision rule:** _"Will this logic be reused by multiple commands within the plugin?"_

- Yes, and it depends on Core → plugin service (`services/`).
- Yes, and it does not depend on Core → pure function (`utils/`).
- No (single use), and it depends on Core → call inline via `args.api.X`.

For a simple command (extending `Command` rather than `BaseTransactionCommand`), the wrapper pattern is identical.

---

## Responsibility Boundaries

| Layer           | Responsibility                                                   | Location                |
| --------------- | ---------------------------------------------------------------- | ----------------------- |
| Core services   | Generic capabilities consumed by multiple plugins.               | `@/core/services/`      |
| Plugin services | Plugin-specific logic that consumes Core services.               | `plugins/<x>/services/` |
| Plugin utils    | Pure functions without dependency injection.                     | `plugins/<x>/utils/`    |
| Shared utils    | Cross-plugin pure functions.                                     | `src/shared/utils/`     |
| Commands        | Inject plugin services and consume Core services via `args.api`. | `plugins/<x>/commands/` |

Cross-plugin shared services are not permitted. Logic that is cross-plugin and depends on services must be promoted to Core; cross-plugin logic without dependencies belongs in `src/shared/utils/`.

---

## Testing

Mock only the dependencies declared in the constructor. Use the `make<Type>Mock()` mock factories.

```typescript
describe('TokenKeysService', () => {
  test('delegates to KeyResolverService', async () => {
    const keyResolver = makeKeyResolverServiceMock({
      resolveSigningKey: jest.fn().mockResolvedValue(MOCK_KEY),
    });
    const service = new TokenKeysService(
      keyResolver,
      makeKmsServiceMock(),
      makeLoggerMock(),
    );

    const result = await service.resolveOptionalKeys(
      [MOCK_CRED],
      MOCK_KEY_MANAGER,
      'test',
    );

    expect(result).toEqual([MOCK_KEY]);
    expect(keyResolver.resolveSigningKey).toHaveBeenCalledWith(
      MOCK_CRED,
      MOCK_KEY_MANAGER,
      false,
      ['test'],
    );
  });
});
```

---

## Migration Scope

Migration proceeds plugin by plugin, with each pull request independently mergeable. There are no breaking changes for CLI users.

| Item                      | Files                                                                     | Action                                                                             |
| ------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `zustand-state-helper.ts` | seven plugins (token, account, topic, contract, batch, schedule, test)    | Rename to `<x>-state.service.ts`, introduce an interface, relocate to `services/`. |
| `*-helper.ts`             | `AccountHelper`, `TopicHelper`, `ContractHelper`, `ScheduleHelper`        | Introduce an interface and relocate to `services/`.                                |
| `utils/*.ts` with DI      | `token-associations.ts`, `token-key-resolver.ts`, `topicResolver.ts`, ... | Convert to a class with an interface under `services/`.                            |
| Wrapper functions         | All affected `handler.ts` files                                           | Construct plugin services and inject them into the command.                        |
| Tests                     | New and existing                                                          | Add tests per plugin service; update mocks in command tests.                       |
| Documentation             | Plugin READMEs                                                            | Update naming and remove references to `Helper`.                                   |
| Cleanup                   | `resolver-helper.ts`                                                      | Remove and replace with `IdentityResolutionService` (Core).                        |

---

## What does NOT change

- `CoreApi` — same fields, same shape.
- `BaseTransactionCommand` — same lifecycle, same hooks.
- Plugin manifest — unchanged.
- `args.api` in handlers — remains available for Core services.
- `makeApiMock` in command tests — continues to work as before.
- Hooks — identical constructor injection of plugin services.

This proposal **is not** a DI container (such as tsyringe or inversify). It introduces no decorators, no `reflect-metadata`, and no container. It is strictly a code-organization convention combined with constructor injection, with the wrapper function serving as the wiring point.

---

## What this does NOT solve

- `CoreApi` remains a god-object exposing 23+ fields.
- `TokenService` remains approximately 700 LOC.
- Low-level and high-level Core services remain mixed within `CoreApi`.
- The absence of explicit architectural layers is not addressed.

These concerns are out of scope. **This ADR addresses a single problem: the lack of a designated location and convention for plugin-internal, reusable logic that depends on Core services.**

---

## TL;DR

**Problem:** Three competing patterns under `utils/`, `Helper` classes without interfaces or a consistent location, and inconsistent handling of plugin-internal logic.

**Decision:** Adopt the Plugin Services Pattern.

- Interface and implementation are placed at `plugins/<x>/services/<name>.service.ts` and `<name>.service.interface.ts`.
- Use constructor injection of concrete Core services; never inject `CoreApi`.
- The wrapper function in `handler.ts` is the wiring point.
- Within a command, `this.X` refers to plugin services and `args.api.X` refers to Core services.
- `utils/` is reserved for pure functions without dependency injection. The `Helper` suffix is eliminated.

**Scope:** Rename and relocate `zustand-state-helper` and `*-helper` to `services/`; migrate `utils/*.ts` modules that rely on DI; remove `resolver-helper.ts`; update tests and documentation accordingly.
