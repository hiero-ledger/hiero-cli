# Migrate `account` plugin to class-based command flow

Migrate all commands in the `account` plugin from plain function handlers to the new class-based flow introduced in PR #1528, where each command extends `BaseTransactionCommand`. The new flow splits command logic into explicit lifecycle stages (`normalizeParams` → `buildTransaction` → `signTransaction` → `executeTransaction` → `outputPreparation`), enabling hook injection at each stage. Use `FooTestCommand` in `src/plugins/test/commands/foo/handler.ts` as the reference implementation.

## Commands to migrate

- [ ] `account create` — `src/plugins/account/commands/create/handler.ts`
- [ ] `account import` — `src/plugins/account/commands/import/handler.ts`
- [ ] `account delete` — `src/plugins/account/commands/delete/handler.ts`
- [ ] `account balance` — `src/plugins/account/commands/balance/handler.ts`
- [ ] `account view` — `src/plugins/account/commands/view/handler.ts`
- [ ] `account list` — `src/plugins/account/commands/list/handler.ts`
- [ ] `account clear` — `src/plugins/account/commands/clear/handler.ts`
