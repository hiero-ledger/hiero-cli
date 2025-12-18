### ADR-005: Explicit Domain Types Instead of Zod-Inferred Types

- Status: Proposed
- Date: 2025-12-16
- Related: `src/core/schemas/*`, `src/core/types/*`, `src/core/services/*`, `examples/zod/*`

## Context

Our current Zod usage mixes **validation, transformation, and typing** in a way that makes it hard to understand the actual data shapes flowing through the system.

### The Problem

When types are inferred from Zod schemas with transformations (`z.infer<typeof SomeSchema>`), developers face significant readability issues:

1. **IDE Navigation Difficulty**: When a developer clicks on a type imported from a handler file (e.g., `KeyOrAccountAlias`), they are taken to `z.infer<typeof KeyOrAccountAliasSchema>`. Clicking again on the schema leads to a complex chain of unions and transforms, making it extremely difficult to understand the actual data shape without reverse-engineering the entire schema.

2. **Code Review Challenges**: During code reviews, reviewers cannot quickly understand what a type represents. They must trace through schema definitions, union types, and transform functions to understand the data structure, significantly slowing down the review process.

3. **Poor Type Discoverability**: Types inferred from schemas are "opaque" - their structure is hidden within Zod's validation logic rather than being explicit and self-documenting.

Example of the problematic pattern:

```ts
export const KeyOrAccountAliasSchema = z
  .union([AccountIdWithPrivateKeySchema, AccountNameSchema])
  .transform((val) =>
    typeof val === 'string'
      ? { type: 'alias' as const, alias: val }
      : { type: 'keypair' as const, ...val },
  );

export type KeyOrAccountAlias = z.infer<typeof KeyOrAccountAliasSchema>;
```

From a type consumer's perspective, it's not obvious what `KeyOrAccountAlias` actually looks like without reverse-engineering the schema + transform chain.

### Goals

- Make **domain types explicit and readable** - developers can understand data shapes by reading type definitions directly.
- Keep Zod **localized to IO boundaries** (CLI, HTTP, config, etc.) where validation is appropriate.
- Use Zod schemas as **implementations** of domain types, not the only way to discover them.
- Improve readability of method signatures (e.g., `resolveKeyOrAlias`) by making types self-explanatory.

### Non-goals

- No behavior changes to parsing/validation logic.
- No changes to public APIs or CLI flags semantics (only typing/structure).
- No framework migration or Zod replacement.
- No changes to schema files used only by plugins (IO boundaries).

## Decision

We will refactor the codebase to introduce **explicit domain types** for complex values that currently come only from `z.infer<typeof SomeSchema>`, while keeping Zod schemas for runtime validation at IO boundaries.

### Approach

#### 1. Define Explicit Domain Types

For each "opaque" inferred type used in services/core, introduce a clear domain type in appropriate type files:

```ts
// src/core/types/shared.types.ts or src/core/services/kms/kms-types.interface.ts
export type KeypairCredential = {
  type: 'keypair';
  accountId: string;
  privateKey: string;
};

export type AliasCredential = {
  type: 'alias';
  alias: string;
};

export type KeyOrAccountAlias = KeypairCredential | AliasCredential;
```

#### 2. Update Service Imports

Services and core logic will import and use explicit domain types instead of inferred types:

**Before:**

```ts
import type { KeyOrAccountAlias } from '@/core/schemas';

public async resolveKeyOrAlias(
  keyOrAlias: KeyOrAccountAlias,
  ...
)
```

**After:**

```ts
import type { KeyOrAccountAlias } from '@/core/services/kms/kms-types.interface';

public async resolveKeyOrAlias(
  keyOrAlias: KeyOrAccountAlias,
  ...
)
```

#### 3. Use Existing Enums Where Possible

For simple types like `KeyAlgorithmType`, replace with existing enums (e.g., `KeyAlgorithm` from `constants.ts`) rather than creating new type definitions.

## Consequences

### Positive

1. **Improved Developer Experience**: Types are immediately readable - developers can understand data structures without navigating through schema chains.
2. **Better Code Reviews**: Reviewers can quickly understand method signatures and data flows without reverse-engineering Zod schemas.
3. **IDE Support**: Better autocomplete and type hints when types are explicit rather than inferred.
4. **Separation of Concerns**: Validation logic (Zod) is separated from type definitions, making both easier to maintain.
5. **Self-Documenting Code**: Method signatures become self-explanatory, reducing the need for extensive documentation.
6. **Faster Onboarding**: New developers can understand the codebase more quickly.

### Negative

1. **Additional Maintenance**: We must maintain both domain types and Zod schemas.
2. **Potential Type-Schema Drift**: Types and schemas must be kept in sync manually, with risk of drift if not carefully maintained.

## Implementation

### Scope

This refactoring applies to all types that are:

1. Defined as `z.infer<typeof SomeSchema>` for non-trivial schemas (unions, transforms, nested objects)
2. **Imported and used in services/core** (outside IO boundaries)

Types used only in plugins (`input.ts`, `output.ts`) remain unchanged as they are at IO boundaries where Zod is appropriate.

For detailed scope analysis, see `examples/zod/refactoring-scope.md`.

## Testing Strategy

- Schema tests remain unchanged (they test validation behavior, not types).
- Service tests already use correct types (`KeyAlgorithm` enum) - no changes needed.
- Integration tests continue to work as they use runtime values, not type definitions.
