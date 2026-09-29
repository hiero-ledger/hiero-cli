---
name: create-community-plugin
description:
  Use when the user wants to scaffold a standalone TypeScript community
  plugin project for hiero-cli (hcli), registered via hcli plugin-management add.
metadata:
  hcli-version: 1.3.0
---

# create-community-plugin skill

> **Documented version: hcli `1.3.0`.** The rules and templates below target this hiero-cli version. Before generating, compare it with the hiero-cli version the user will depend on (see Phase 1); if they differ, warn the user that the generated project may not be compatible.

Scaffold a standalone TypeScript project that exports one or more plugins for hiero-cli, registered via `hcli plugin-management add -p '<manifest-path>'`.

## Setup

Before doing anything else, read the full contents of `references/RULES.md`, located next to this `SKILL.md` (in the hiero-cli repository: `skills/create-community-plugin/references/RULES.md`; if the skill is installed elsewhere, e.g. under `.claude/skills/create-community-plugin/`, use the copy beside this file). It contains project structure rules, config file templates, naming conventions, and code generation standards. Apply them silently — do not narrate rule application. Only surface a rule if the user's requirements conflict with it.

---

## Phase 0: Mode Detection

Check whether the target directory already contains a project (has a `package.json`):

- **Fresh mode** — no existing project. Run the full interview and generate everything from scratch.
- **Expansion mode** — existing project detected. Skip project-level questions; go directly to Phase 2 (Plugin Interview) and add the new plugin alongside the existing ones.

If the target directory does not exist yet, it is always fresh mode.

---

## Phase 1: Project Interview (fresh mode only)

Ask questions one at a time. Each question follows naturally from the previous answer.

**Required information:**

1. **Project name** (kebab-case) — used as the npm package name and directory name
2. **Project description** — one sentence
3. **Target directory** — default: `~/IdeaProjects/{project-name}`; confirm with the user
4. **hiero-cli source** — ask the user to choose:
   - Latest npm version (`@hiero-ledger/hiero-cli@latest`)
   - Local `.tgz` file — ask for the absolute path to the file

---

## Phase 2: Plugin Interview

Ask questions one at a time. The goal is to gather enough information to generate every plugin file without ambiguity.

**Minimum required before Phase 3:**

- Plugin name (kebab-case)
- Plugin display name and description
- Full list of commands, and for each:
  - Command name and purpose
  - Whether it submits a Hedera transaction (determines handler pattern A or B)
  - All CLI options: name, short flag, type, required/optional, default value, description
  - Output fields: what data does the command return?
  - Whether the command is destructive (needs `requireConfirmation`)
  - Whether the command should support batchify/scheduled hooks
- Whether the plugin persists data to state (and if so, what fields)
- Whether the plugin defines its own hooks (custom hook classes)

**Interview rules:**

- "Creates something on Hedera" / "submits a transaction" → Pattern B (`BaseTransactionCommand`). Ask about transaction lifecycle only when relevant.
- "List", "view", "get", "show", "read" → Pattern A (simple `Command`). Do not ask about transaction lifecycle.
- When the user names an option, ask for its short flag if not provided.
- Ask about `requireConfirmation` only for commands described as deleting or clearing resources.
- Ask about hook registration (batchify/scheduled) only for transaction commands.
- Ask about state persistence once — not per command.

---

## Phase 3: Confirmation

Before generating anything, present a summary:

```text
Project: {name}
Directory: {absolute-path}
hiero-cli: {npm version | file:/absolute/path.tgz}
Mode: {fresh | expansion}

Plugin: {plugin-name} ({displayName})
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

⚠️ Rule conflicts: {list or "none"}
```

Ask: **"Does this look correct? Anything to change before I generate?"**

Wait for explicit confirmation before proceeding.

---

## Phase 4: Generate

### 4a. Project scaffold (fresh mode only)

Generate files in this order:

1. Create the project directory
2. Run `git init` inside it; create `.gitignore`
3. `package.json` — use the template from RULES.md §12, substituting `{project-name}`, `{description}`, and the hiero-cli dependency value; pin every version exactly (no `^`/`~`) and cross-check all `dependencies`/`devDependencies` versions against `hiero-ledger/hiero-cli` `package.json`
4. `tsconfig.base.json`, `tsconfig.json`, `tsconfig.test.json` — copy verbatim from `hiero-ledger/hiero-cli` (see RULES.md §12)
5. `jest.config.js`, `jest.unit.config.js` — copy verbatim from `hiero-ledger/hiero-cli`
6. `eslint.config.js`, `.prettierrc`, `.prettierignore` — copy verbatim from `hiero-ledger/hiero-cli`
7. `README.md` — project name, one-line description, and the ready-to-run `hcli plugin-management add` command

### 4b. Plugin files

Generate in this order:

1. `src/plugins/{name}/manifest.ts`
2. For each command:
   - `src/plugins/{name}/commands/{command}/input.ts`
   - `src/plugins/{name}/commands/{command}/output.ts`
   - `src/plugins/{name}/commands/{command}/handler.ts`
   - `src/plugins/{name}/commands/{command}/types.ts` (only if Pattern B with complex intermediate types)
   - `src/plugins/{name}/commands/{command}/index.ts`
3. `src/plugins/{name}/schema.ts` (only if the plugin persists state)
4. `src/plugins/{name}/index.ts`
5. `src/plugins/{name}/__tests__/unit/helpers/mocks.ts`
6. `src/plugins/{name}/__tests__/unit/helpers/fixtures.ts`
7. For each command: `src/plugins/{name}/__tests__/unit/{command}.test.ts`

Apply all rules from RULES.md silently. If a user requirement conflicts with a rule, flag it in the Phase 3 summary under "⚠️ Rule conflicts", propose a compliant alternative, and proceed with the compliant version unless the user explicitly overrides.

### 4c. Build verification

Run sequentially from inside the project directory:

```bash
npm install
npm run build
```

Node >=24.19.0 is required (same as hiero-cli). `npm install` is used because the freshly generated project has no lockfile yet (the `install:safe` guard of the hiero-cli repo itself is not part of the generated project).

If either command fails:

1. Read the full error output
2. Fix the generated files (type errors, import issues, missing exports, formatting)
3. Re-run `npm run build` (no need to re-run `npm install` unless a new dependency is required)
4. Repeat until both exit with code 0

Do not declare success until both commands complete cleanly.

---

## Phase 5: Done

Output a short summary:

```text
✅ Plugin project scaffolded.

Project: {absolute-path}
Plugin:  {plugin-name}

Files created:
  {list of all created files}

Register with hiero-cli:
  hcli plugin-management add -p '{absolute-path}/dist/plugins/{plugin-name}/manifest.js'

⚠️  The manifest path above is machine-local. If you move this project, re-run the add command with the new path.
[If local .tgz: ⚠️  package.json references a local .tgz — update the path if that file moves.]

Next steps:
  1. Implement handler logic in each handler.ts (marked with // IMPLEMENT)
  2. Run tests: npm test
```
