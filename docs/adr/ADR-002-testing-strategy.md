# ADR-002: Comprehensive Testing Strategy for Hiero CLI

## Status

**Accepted** – This ADR has been implemented and is actively used.

## Date

2025-10-03

## Related

- `src/core/*`
- `src/plugins/*`
- `src/__tests__/integration/*`
- GitHub Actions CI/CD workflows

---

## Context

Hiero CLI is a TypeScript-based command-line application that provides a plugin architecture for interacting with Hedera. The project already contains a number of tests, but they were written before the refactor to a plugin-based model. As the CLI grows, we need a testing strategy that ensures:

1. **Reliability** – Changes in core or plugins do not break existing functionality.
2. **Developer Experience** – Fast, automated test execution both locally and in CI.
3. **Maintainability** – Tests are easy to write, extend, and update alongside plugins.
4. **Confidence in Workflows** – End-to-end scenarios reflect the actual CLI user experience.
5. **Consistency** – Uniform use of a single test framework across all test tiers.

Our testing must focus primarily on the **CLI core, built-in plugins, and end-user workflows**. Since the CLI is designed around a plugin architecture, the tests should validate not only the correctness of individual commands but also the reliability of plugin loading, state management, and end-to-end user scenarios executed through the CLI.

---

## Decision

We will implement a **two-tier testing strategy**:

1. **Unit Tests** – Verify individual components, services, and plugin handlers in isolation.
2. **Integration Tests** – Test plugin interactions and service integrations without full CLI process execution.

### Key Decisions

#### Testing Framework

- **Jest** will be used as the single testing framework for unit and integration tests.
- This ensures consistent tooling, mocks, and assertions across the project.

#### Test Organization

- `src/core/services/*/__tests__/unit/*` – Unit tests for Core services (config, logger, network, kms, state, output, plugin-management, etc.).
- `src/core/plugins/__tests__/unit/*` – Unit tests for plugin management and core plugin infrastructure.
- `src/plugins/*/__tests__/unit/*` – Unit tests for plugin command handlers.
- `src/__tests__/integration/*` – Integration tests for plugin interactions and service integrations.
- Legacy tests will be reviewed after the plugin refactor; some will be removed or rewritten.

#### CI/CD Integration

- **Pre-commit hooks** will run the unit test suite to provide immediate feedback.
- **GitHub Actions** will execute the full pipeline:
  - Unit tests on every push and PR (`npm run test:unit`).
  - Integration tests on PR to `main` branch (pipeline execution).
  - All tests can be run together locally with `npm run test` (unit + integration).

### Test Coverage

- **Unit tests**: Comprehensive coverage for Core services (config, logger, network, kms, state, output, plugin-management, hbar, alias, account, token, topic, tx-execution, mirrornode) and plugin handlers. Tests validate core business logic, command handlers, and state management in isolation.

- **Integration tests**: Coverage for plugin interactions and service integrations, ensuring that plugins work correctly together and with Core services.

---

## Consequences

### Positive

1. **Confidence** – Both core logic and user workflows are tested.
2. **Consistency** – Single framework (Jest) reduces complexity.
3. **Automation** – Tests run pre-commit and in CI/CD pipelines.
4. **Maintainability** – Plugin refactor allows more modular and reusable tests.
5. **Improved developer onboarding** – New team members can quickly understand the testing strategy and start writing tests in a consistent way.
6. **Higher confidence in refactoring** – A well-defined testing strategy reduces the risk of regressions when refactoring the codebase.
7. **Lower chance of bugs** – Comprehensive test coverage across different layers decreases the likelihood of undetected issues reaching production.

### Negative

1. **Test Overhead** – Writing and maintaining tests adds cost.
2. **Longer Pipelines** – Integration tests may increase runtime.
3. **Maintenance** – Two-tier strategy requires maintaining multiple test suites.

### Risks & Mitigation

- **Risk: Legacy Test Debt** – Audit and remove/replace outdated tests post-refactor.
- **Risk: Pipeline Delays** – Run unit tests pre-commit, integration tests on `main` merges and release builds.

---

## Implementation Plan

### Phase 1: Foundation

- Set up Jest configuration for unit and integration tests.
- Define test folder structure:
  - Unit tests: `src/core/services/*/__tests__/unit/*`, `src/core/plugins/__tests__/unit/*`, `src/plugins/*/__tests__/unit/*`
  - Integration tests: `src/__tests__/integration/*`
- Integrate into GitHub Actions workflow.

### Phase 2: Unit Test Coverage

- Added unit tests for Core services:
  - `ConfigService`, `LoggerService`, `NetworkService`, `KmsService`, `StateService`
  - `OutputService`, `PluginManagementService`, `HbarService`, `AliasService`
  - `AccountTransactionService`, `TokenService`, `TopicService`
  - `TxExecutionService`, `HederaMirrornodeService`
- Added unit tests for plugin management (`PluginManager`).
- Mocks and test utilities are centralized in `src/__tests__/mocks/mocks.ts` for shared mocks, with service-specific mocks in `__tests__/unit/mocks.ts` files within each service/plugin directory.
- Plugin lifecycle validated in isolation with mocked contexts.

### Phase 3: Integration Tests

- Integration tests implemented for plugin interactions and service integrations.
- Tests validate plugin loading, command registration, and service interactions.
- **Environment Configuration**: Integration tests require environment variables to be configured in a `.env.test` file in the project root. The file must contain:

  - `OPERATOR_ID`: Hedera account ID in format `0.0.{number}` (must have at least 1 Hbar for transaction fees)
  - `OPERATOR_KEY`: Account private key in hex format (ED25519 or ECDSA)
  - `NETWORK`: Network name (`testnet` or `localnet`)

  The `.env.test` file is loaded automatically by Jest integration test setup (`jest.integration.setup.js`) and is excluded from version control via `.gitignore`.

---

## Alternatives Considered

- **Integration Tier** – Adding integration tests between Core and plugins without full CLI process.
