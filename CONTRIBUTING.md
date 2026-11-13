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

- Hiero CLI version (`hcli --version`)
- Node.js version (`node --version`)
- OS and shell
- Exact command run and full error output
- Steps to reproduce

When requesting a feature, describe the use case — not just the desired behavior.

Search existing issues before opening a new one.

## Development Setup

**Prerequisites:** Node.js `>24.19.0`, npm

```bash
git clone https://github.com/hiero-ledger/hiero-cli.git
cd hiero-cli
npm run install:safe
npm run build
```

Update `.env.test` with your Hedera testnet credentials if you plan to run integration tests with a live network, or leave the predefined local Hiero network credentials if you use solo (`npm run solo`).

For a full local development environment, see [Development](./README.md#development) in the root README.

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

Most feature work lives under `src/plugins/`. See [`PLUGIN_ARCHITECTURE_GUIDE.md`](./docs/PLUGIN_ARCHITECTURE_GUIDE.md) for the full guide on creating and extending plugins.

When modifying a plugin:

- Update `README.md` inside the plugin directory to reflect behavioral changes
- Add or update tests under `__tests__/unit/`
- Keep `schema.ts` as the single source of truth for option types

## Forbidden Patterns

- **No `any`** — use `unknown`, `never`, or a precise type; cast with `as` only as a last resort
- **No hardcoded credentials or network addresses** — use constants or config
- **No silent error swallowing** — always propagate or surface errors explicitly

## Commit Convention

Format: `feat({issue}): {short_description}`

Example:

```text
feat(1662): add kyc grant/revoke commands
```

Breaking changes go in the footer:

```text
feat(1662): replace state file format

BREAKING CHANGE: existing .hiero-cli/state/ files must be migrated
```

## Branch Naming

```text
feat/{issue}-{task_name}
```

Example: `feat/1662-kyc-grant-revoke`

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

```bash
npm run test:unit
```

Jest is configured via `jest.unit.config.js`. Each plugin keeps its tests under `src/plugins/{name}/__tests__/unit/`. Coverage reports are written to `coverage/unit/`.

Integration tests require a Hedera account configured in `.env.test`:

```bash
npm run test:integration
```

`.env.test` must define the following variables:

| Variable          | Description                                                                          | Example    |
| ----------------- | ------------------------------------------------------------------------------------ | ---------- |
| `OPERATOR_ID`     | Account ID of the operator                                                           | `0.0.1234` |
| `OPERATOR_KEY`    | DER-encoded private key of the operator                                              | `302e...`  |
| `NETWORK`         | Target network (`testnet` or `localnet`)                                             | `testnet`  |
| `ED25519_SUPPORT` | `true` if the operator key is ED25519 (e.g. the Solo `0.0.2` operator), else `false` | `true`     |

For `localnet`, spin up a local Hedera node and point the CLI at it — see [Development](./README.md#development) for details. `.env.test.sample` ships ready-to-use defaults for the Solo network started by `npm run solo`.

The CI pipeline always runs the integration tests against a Solo localnet that it deploys on the fly, using Solo's genesis operator (`0.0.2`) and its well-known ED25519 key. It does not use the Hedera testnet and needs no repository secrets.

Localnet endpoints are resolved from the environment, so the tests can reach a network that is not published on this machine's `localhost` — for example a Solo running on the host, reached from inside a container through `host.docker.internal`:

| Variable                  | Description                                                                            | Default                       |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------- |
| `CONSENSUS_NODE_ENDPOINT` | Consensus node gRPC endpoint, as `host:port`                                           | `localhost:35211`             |
| `MIRROR_NODE_URL`         | Mirror node REST base URL (the CLI appends `/api/v1`)                                  | `http://localhost:38081`      |
| `JSON_RPC_RELAY_URL`      | JSON-RPC relay URL                                                                     | `http://localhost:37546`      |
| `EXPLORER_URL`            | Explorer base URL for localnet — the CLI appends `/localnet`                           | `http://localhost:38080`      |
| `ED25519_SUPPORT`         | Sets the `ed25519_support` config option for the run — required for solo's ED25519 key | unset (option stays disabled) |

## Code Style & Tooling

```bash
npm run lint        # check for lint errors
npm run lint:fix    # auto-fix where possible
npm run format      # apply Prettier formatting
npm run format:check
```

ESLint runs on v10 using the flat config in `eslint.config.js`. The import
rules come from `eslint-plugin-import-x` — the original `eslint-plugin-import`
does not support ESLint 10 yet — so its rules and settings use the
`import-x/*` namespace (e.g. `import-x/no-duplicates`, `import-x/resolver`).

Run linting and formatting before every PR. The CI pipeline will block PRs that fail either check.
