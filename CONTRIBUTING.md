## Contributing

### Development Setup

Install dependencies:

```
npm install
```

Run a build:

```
npm run build
```

### Running Tests

- **Unit tests** are executed with:

  ```sh
  npm run test:unit
  ```

- **Integration tests** are executed with:

  ```sh
  npm run test:integration
  ```

  **Note**: Integration tests require environment variables to be configured in a `.env.test` file in the project root. Create this file with the following variables:

  ```env
  OPERATOR_ID=0.0.123456
  OPERATOR_KEY=302e020100300506032b657004220420...
  NETWORK=testnet
  ```

  Where:

  - `OPERATOR_ID` is your Hedera account ID in format `0.0.{number}` (must have at least 1 Hbar for transaction fees)
  - `OPERATOR_KEY` is your account's private key in hex format (ED25519 or ECDSA)
  - `NETWORK` is either `testnet` or `localnet`

  The `.env.test` file is already included in `.gitignore` to prevent committing sensitive credentials.

- **All tests** (unit + integration) can be run together with:

  ```sh
  npm run test
  ```

- Jest is configured via `jest.unit.config.js` for unit tests and `jest.integration.config.js` for integration tests.
- **Core services** have unit tests under `src/core/services/*/__tests__/unit/` (for example, `src/core/services/config/__tests__/unit/config-service.test.ts`).
- **Plugin handlers** have unit tests under `src/plugins/*/__tests__/unit/` (for example, `src/plugins/account/__tests__/unit/`).
- **Plugin management** has unit tests under `src/core/plugins/__tests__/unit/`.
- **Integration tests** are located under `src/__tests__/integration/`.
- Coverage reports are written to `coverage/unit/` and `coverage/integration/` respectively.

### Code Style & Tooling

- Use ESLint to catch common issues:

  ```sh
  npm run lint
  ```

- Automatically fix lint issues where possible:

  ```sh
  npm run lint:fix
  ```

- Enforce consistent formatting with Prettier:

  ```sh
  npm run format:check
  npm run format
  ```

Please run linting and formatting checks before opening a PR.

### Working on Plugins

Most feature work lives in the built‑in plugins under `src/plugins/` (for example, `src/plugins/account`, `src/plugins/token`, etc.).

- Follow the structure and patterns described in [`PLUGIN_ARCHITECTURE_GUIDE.md`](./PLUGIN_ARCHITECTURE_GUIDE.md).
- When you change a plugin's behaviour or commands, update that plugin's `README.md` to match and other documentation files if needed.
- Add or update tests under the plugin's `__tests__/unit/` directory to cover new or changed behaviour.

### Working on Core Services

Core services are located under `src/core/services/` (for example, `src/core/services/config`, `src/core/services/network`, etc.).

- When you change a core service's behaviour, add or update unit tests under `src/core/services/<service-name>/__tests__/unit/`.
- Use shared mocks from `src/__tests__/mocks/mocks.ts` when possible, or create service-specific mocks in `__tests__/unit/mocks.ts`.
- Follow the established testing patterns and guidelines for consistency.

### State & Configuration (High Level)

The CLI stores per‑plugin state as JSON files under the user‑specific `.hedera-cli/state/` directory (see the main `README.md` for details). For an up‑to‑date description of configuration and state behavior, refer to the **Configuration & State Storage** section in the root [`README.md`](./README.md#configuration--state-storage).

### Commit Guidelines

- Keep patches focused; unrelated formatting churn makes review harder.
- Prefer small, composable utility helpers when test logic starts repeating (e.g., temp file creation, logger control).
- Run the full test suite (`npm run test`) before opening a PR to ensure both unit and integration tests pass.
- When you change behaviour, add or update tests to cover the new logic.
- Keep documentation in sync with code changes (for example, plugin `README.md` files or relevant docs under `docs/`).

### Questions / Improvements

Open an issue or PR if you see an opportunity to simplify the test setup, improve state handling, or extend configuration validation.
