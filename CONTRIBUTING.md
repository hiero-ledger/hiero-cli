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

- Unit tests are executed with:

  ```sh
  npm run test:unit
  ```

- Jest is configured via `jest.unit.config.js` to run all `*.test.ts` files under `**/__tests__/**`.
- Each plugin keeps its own test suite under its `__tests__/` directory (for example, `src/plugins/account/__tests__/unit/`).
- Coverage reports are written to `coverage/unit/`.

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
- When you change a plugin’s behaviour or commands, update that plugin’s `README.md` to match and other documentation files if needed.
- Add or update tests under the plugin’s `__tests__/` directory to cover new or changed behaviour.

### State & Configuration (High Level)

The CLI stores per‑plugin state as JSON files under the user‑specific `.hiero-cli/state/` directory (see the main `README.md` for details). For an up‑to‑date description of configuration and state behavior, refer to the **Configuration & State Storage** section in the root [`README.md`](./README.md#configuration--state-storage).

### Commit Guidelines

- Keep patches focused; unrelated formatting churn makes review harder.
- Prefer small, composable utility helpers when test logic starts repeating (e.g., temp file creation, logger control).
- Run the full unit suite before opening a PR.
- When you change behaviour, add or update tests to cover the new logic.
- Keep documentation in sync with code changes (for example, plugin `README.md` files or relevant docs under `docs/`).

### Questions / Improvements

Open an issue or PR if you see an opportunity to simplify the test setup, improve state handling, or extend configuration validation.
