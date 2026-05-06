# plugin-create skill

Scaffold a new hiero-cli plugin by interviewing the user, then generating rules-compliant code.

## Setup

Before doing anything else, read the full contents of `skills/plugin-create/RULES.md`. This file contains the architectural rules you must enforce during code generation. You will apply them silently — do not narrate rule application. Only surface a rule if the user's requirements conflict with it.

Also read `src/core/shared/config/cli-options.ts` to get the list of existing plugin names and reserved short options — you need these to avoid naming conflicts.

---

## Phase 1: Interview

Ask questions one at a time. Do not present a list of questions upfront. Each question should follow naturally from the previous answer. The goal is to gather enough information to generate every file in the plugin without ambiguity.

**Minimum information required before proceeding to Phase 2:**

- Plugin name (kebab-case)
- Plugin display name and description
- Full list of commands, and for each:
  - Command name and purpose
  - Whether it submits a Hedera transaction (determines handler pattern)
  - All CLI options: name, short flag, type, required/optional, default value, description
  - Output fields: what data does the command return?
  - Whether the command is destructive (needs confirmation prompt)
  - Whether the command should support batchify/scheduled hooks
- Whether the plugin persists data to state (and if so, what fields)
- Whether the plugin defines its own hooks (custom hook classes)
- Whether to register this plugin in `DEFAULT_PLUGIN_STATE`

**Interview rules:**

- If the user says a command "creates something on Hedera" or "submits a transaction" → it uses Pattern B (BaseTransactionCommand). Ask about the transaction lifecycle only when relevant.
- If the user describes a command as "list", "view", "get", "show", or "read" → it uses Pattern A (simple Command). Do not ask about transaction lifecycle.
- When the user names a command option, ask for its short flag if they haven't provided one.
- If the user specifies an output field that maps to a known common schema (`EntityIdSchema`, `NetworkSchema`, `TransactionIdSchema`, `EvmAddressSchema`, etc.), note it — use the common schema in generation.
- Ask about `requireConfirmation` only for commands the user describes as deleting or clearing resources.
- Ask about hook registration (batchify/scheduled) only for transaction commands.
- Ask about state persistence once — not per command.
- Ask about `DEFAULT_PLUGIN_STATE` registration once, at the end of the interview.

---

## Phase 2: Confirmation

Before generating any code, present a structured summary:

```
Plugin: {name} ({displayName})
Description: {description}

Commands:
  {command-name} — {summary}
    Handler: Pattern A (simple) | Pattern B (transaction)
    Options: {list}
    Output fields: {list}
    Hooks: {list or none}
    Confirmation: {yes/no}

State: {yes — fields: ... | no}
Custom hooks: {yes — names: ... | no}
Register as default: {yes | no}

⚠️ Rule conflicts: {list any conflicts, or "none"}
```

Then ask: **"Does this look correct? Anything to change before I generate?"**

Wait for explicit confirmation before proceeding.

---

## Phase 3: Generate

Generate all files in this order:

1. `src/plugins/{name}/manifest.ts`
2. For each command:
   - `src/plugins/{name}/commands/{command}/input.ts`
   - `src/plugins/{name}/commands/{command}/output.ts`
   - `src/plugins/{name}/commands/{command}/handler.ts`
   - `src/plugins/{name}/commands/{command}/types.ts` (only if Pattern B)
   - `src/plugins/{name}/commands/{command}/index.ts`
3. `src/plugins/{name}/schema.ts` (only if state needed)
4. `src/plugins/{name}/index.ts`
5. `src/plugins/{name}/__tests__/unit/helpers/mocks.ts`
6. `src/plugins/{name}/__tests__/unit/helpers/fixtures.ts`
7. For each command: `src/plugins/{name}/__tests__/unit/{command}.test.ts`
8. If registration requested: update `src/core/shared/config/cli-options.ts`

**Generation rules:**

- Apply all rules from RULES.md silently
- Use real imports — never use placeholder strings like `// TODO: import X`
- Do not generate `utils/` or `constants.ts` unless the interview revealed a concrete need
- Handler tests must mock `args.api`, `args.state`, `args.logger`, `args.config` using the pattern in `__tests__/unit/helpers/mocks.ts`
- Test file must include at minimum: one happy-path test and one validation-error test per command

**Conflict handling:**
If a user requirement conflicts with a rule in RULES.md, do not silently ignore it. Flag it in the Phase 2 summary under "⚠️ Rule conflicts" and propose a compliant alternative. Proceed with the compliant version unless the user explicitly overrides.

---

## Phase 4: Done

After generating all files, output a short summary:

```
✅ Plugin {name} scaffolded.

Files created:
  {list of created files}

{If registered: "Registered in DEFAULT_PLUGIN_STATE in src/core/shared/config/cli-options.ts"}

Next steps:
  1. Implement the handler logic in each handler.ts (marked with // IMPLEMENT)
  2. Run: npx tsc --noEmit to verify types
  3. Run tests: npx jest src/plugins/{name}
```

Mark every unimplemented handler body with a `// IMPLEMENT` comment so the developer knows exactly where to add logic.
