# ADR-002: Comprehensive Testing Strategy for Hiero CLI

## Status

**Proposed** – This ADR is under review and discussion.

## Date

2025-10-03

## Related

- `src/core/*`
- `src/plugins/*`
- `__tests__/unit/*`
- `__tests__/e2e/*`
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
2. **End-to-End Tests (E2E)** – Validate complete CLI workflows by executing real commands against Hedera testnet.

### Key Decisions

#### Testing Framework

- **Jest** will be used as the single testing framework for both unit and E2E tests.
- This ensures consistent tooling, mocks, and assertions across the project.

#### Test Organization

- `__tests__/unit/*` – Unit tests for Core services, plugin handlers, and utilities.
- `__tests__/e2e/*` – CLI process tests simulating user workflows.
- Legacy tests will be reviewed after the plugin refactor; some will be removed or rewritten.

#### CI/CD Integration

- **Pre-commit hooks** will run the unit test suite to provide immediate feedback.
- **GitHub Actions** will execute the full pipeline:
  - Unit tests on every push and PR.
  - E2E tests on PR to `main` and before releases.

### Test Coverage

- Unit tests: **TBD% line coverage** will be required to ensure that the core business logic, command handlers, and state management are properly validated in isolation.

- E2E tests: **TBD% critical path coverage** will be required to guarantee that key user workflows (such as account management, token operations, and plugin interactions) function correctly in a production-like environment.

#### End-to-End Testing Strategy

- E2E tests will run the CLI as a separate process (`hcli ...`), verifying its output, error messages, and exit codes to reflect the real end-user experience.
- The focus will be on **critical workflows defined in ADR-001-plugin-architecture**, ensuring that end-to-end scenarios for account management, token operations, and plugin lifecycle are fully validated.
- Hedera **testnet** will be used to execute real transactions, providing confidence that the CLI behaves correctly against a live network.
- Tests will include cleanup routines to guarantee isolation between runs and prevent side effects from persisting across test executions.

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
2. **Longer Pipelines** – E2E tests with testnet may increase runtime.
3. **Partial Coverage** – With no integration tier, some interactions are only covered by E2E tests.

### Risks & Mitigation

- **Risk: Test Flakiness on Testnet** – Use retries and stable accounts for test execution.
- **Risk: Legacy Test Debt** – Audit and remove/replace outdated tests post-refactor.
- **Risk: Pipeline Delays** – Run unit tests pre-commit, E2E only on `main` merges and release builds.

---

## Implementation Plan

### Phase 1: Foundation

- Set up Jest configuration for both unit and E2E tests.
- Define test folder structure (`tests/unit`, `tests/e2e`).
- Integrate into GitHub Actions workflow.

### Phase 2: Unit Test Coverage

- Add unit tests for Core services (`AccountTransactionService`, `TxExecutionService`, `HederaMirrornodeService`).
- Mocks and test utilities will be centralized in a dedicated testing module (e.g. `__tests__/helpers` or `__tests__/unit/mocks`), to avoid duplication across unit and e2e tests.
- Validate plugin lifecycle in isolation with mocked contexts.

### Phase 3: End-to-End Workflows

- Write E2E tests that execute CLI commands.
- Cover account creation, token transfer, and the rest of the plugin commands.
- Implement cleanup and isolation strategies.

---

## Alternatives Considered

- **Integration Tier** – Adding integration tests between Core and plugins without full CLI process.
