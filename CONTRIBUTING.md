# Contributing to Hiero CLI

We welcome contributions from everyone. This guide covers everything you need to start contributing effectively.

## Code of Conduct

Be respectful and constructive in all interactions. We do not tolerate harassment, discriminatory language, or bad-faith contributions. Violations may result in removal from the project.

## Ways to Contribute

- **Report a bug** — open an issue with steps to reproduce
- **Request a feature** — open an issue describing the use case
- **Fix a bug or implement a feature** — open an issue first, then a PR
- **Improve documentation** — PRs welcome without a prior issue

## Issue Guidelines

**Open an issue before submitting a PR** for any bug fix or feature. This ensures alignment before you invest time writing code. Small fixes (typos, docs) may skip this step.

When reporting a bug, include:

- Hiero CLI version (`hiero-cli --version`)
- Node.js version (`node --version`)
- OS and shell
- Exact command run and full error output
- Steps to reproduce

When requesting a feature, describe the use case — not just the desired behavior.

Search existing issues before opening a new one.

## Development Setup

**Prerequisites:** Node.js `>=18.0.0`, npm

```sh
git clone https://github.com/hiero-ledger/hiero-cli.git
cd hiero-cli
npm install
npm run build
```

Copy `.env.test.sample` to `.env.test` and fill in your Hedera testnet credentials if you plan to run integration tests.

## Project Structure

| Path                             | Role                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `src/hiero-cli.ts`               | CLI entry point — bootstraps Commander and registers plugins |
| `src/core/`                      | Core API — services, errors, types exported as public API    |
| `src/core/index.ts`              | Core public exports                                          |
| `src/plugins/`                   | Built-in plugins (one directory per plugin)                  |
| `src/plugins/{name}/manifest.ts` | Plugin declaration — registers commands and hooks            |
| `src/plugins/{name}/schema.ts`   | Zod schemas for command options and state                    |
| `src/plugins/{name}/index.ts`    | Plugin entry point — exports manifest and output schemas     |
| `src/plugins/{name}/commands/`   | Individual command handlers                                  |
| `src/plugins/{name}/hooks/`      | State lifecycle hooks (pre/post command)                     |
| `src/plugins/{name}/__tests__/`  | Unit tests for the plugin                                    |

## Working on Plugins

Most feature work lives under `src/plugins/`. See [`PLUGIN_ARCHITECTURE_GUIDE.md`](./PLUGIN_ARCHITECTURE_GUIDE.md) for the full guide on creating and extending plugins.

When modifying a plugin:

- Update `README.md` inside the plugin directory to reflect behavioral changes
- Add or update tests under `__tests__/unit/`
- Keep `schema.ts` as the single source of truth for option types

## Forbidden Patterns

- **No `any`** — use `unknown`, `never`, or a precise type; cast with `as` only as a last resort
- **No mutation** — return new objects instead of modifying existing ones
- **No hardcoded credentials or network addresses** — use constants or config
- **No silent error swallowing** — always propagate or surface errors explicitly

## Commit Convention

Format: `<type>(<issue>): <description>`

Types:

- `feat` — new command or capability
- `fix` — bug fix
- `docs` — documentation only
- `test` — adding or fixing tests
- `chore` — tooling, deps, CI
- `refactor` — code change with no behavior change

Examples:

```
feat(1662): add kyc grant/revoke commands
fix(1793): handle nullable balance in account list
docs(1684): update contributing guide
```

Breaking changes go in the footer:

```
feat(core): replace state file format

BREAKING CHANGE: existing .hiero-cli/state/ files must be migrated
```

## Branch Naming

```
feat-{issue}/{short-description}
fix-{issue}/{short-description}
docs-{issue}/{short-description}
```

Examples: `feat-1662/kyc-grant-revoke`, `fix-1793/nullable-balance`

## Pull Request Workflow

1. Fork the repository and create your branch from `main`
2. Make your changes — keep the PR focused on a single concern
3. Run the pre-PR checklist below
4. Open a PR against `main` with a clear description:
   - What problem does this solve?
   - Link to the related issue
   - Notable implementation decisions (if any)
5. Address reviewer feedback; mark conversations resolved as you go
6. A maintainer will merge once approved

## Pre-PR Checklist

Before opening a PR, run:

- [ ] `npm run build` — project compiles without errors
- [ ] `npm run test:unit` — all unit tests pass
- [ ] `npm run lint` — no lint errors
- [ ] `npm run format:check` — code is formatted correctly

If any command fails, fix it before submitting.

## Running Tests

Unit tests (no network required):

```sh
npm run test:unit
```

Jest is configured via `jest.unit.config.js`. Each plugin keeps its tests under `src/plugins/{name}/__tests__/unit/`. Coverage reports are written to `coverage/unit/`.

Integration tests require a Hedera testnet account configured in `.env.test`:

```sh
npm run test:integration
```

See `.env.test.sample` for the required variables (`OPERATOR_ID`, `OPERATOR_KEY`, `NETWORK`).

## Code Style & Tooling

```sh
npm run lint        # check for lint errors
npm run lint:fix    # auto-fix where possible
npm run format      # apply Prettier formatting
npm run format:check
```

Run linting and formatting before every PR. The CI pipeline will block PRs that fail either check.
