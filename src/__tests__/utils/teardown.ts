import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AccountListOutput } from '@/plugins/account/commands/list';
import type { AccountViewOutput } from '@/plugins/account/commands/view';

import * as fs from 'fs';

import { accountImport, accountList, accountView } from '@/plugins/account';
import { hbarTransfer } from '@/plugins/hbar/commands/transfer';

import { waitFor } from './common-utils';

export const deleteStateFiles = (dir: string): void => {
  fs.rmSync(dir, { recursive: true, force: true });
};

// CLI errors keep the useful part (e.g. the failing Hedera status) in their
// context, so prefer it when telling why a refund did not go through.
const describeFailure = (error: unknown): string => {
  const detailedMessage = (error as { context?: { detailedMessage?: string } })
    .context?.detailedMessage;
  return (
    detailedMessage ?? (error instanceof Error ? error.message : String(error))
  );
};

export const returnFundsFromCreatedAccountsToMainAccount = async (
  coreApi: CoreApi,
): Promise<void> => {
  const pendingAccounts = new Set<string>();
  const refundFailures = new Map<string, string>();
  let refundedCount = 0;

  try {
    const accountListResult = await accountList({
      args: {},
      api: coreApi,
    });
    const accountOutput = accountListResult.result as AccountListOutput;
    for (const account of accountOutput.accounts) {
      // Only accounts this run created may be drained: an imported account
      // (e.g. an externally owned one) still belongs to somebody else.
      if (account.name && account.origin !== 'imported') {
        pendingAccounts.add(account.name);
      }
    }

    const importAccountArgs: Record<string, unknown> = {
      name: 'main-account',
      key: `${process.env.OPERATOR_ID as string}:${process.env.OPERATOR_KEY as string}`,
    };
    try {
      await accountImport({
        args: importAccountArgs,
        api: coreApi,
      });
    } catch {
      // main-account may already exist
    }

    if (pendingAccounts.size === 0) {
      return;
    }

    // The balance is read up front so the wait below only has to prove that
    // it grew.
    const mainAccountView = await accountView({
      args: { account: 'main-account' },
      api: coreApi,
    }).catch(() => undefined);
    const mainAccountBalanceBefore = mainAccountView
      ? (mainAccountView.result as AccountViewOutput).balance
      : undefined;

    try {
      // hbarTransfer resolves as soon as its receipt is fetched, so refunds
      // do not depend on one another and are fired concurrently. Anything
      // still pending after a round is what the mirror has not caught up with
      // yet — an account created by the last suite only becomes visible ~1s
      // after its creation — so it is retried on the next round.
      await waitFor(
        async () => {
          const outcomes = await Promise.all(
            [...pendingAccounts].map(async (accountName) => {
              try {
                const viewAccountResult = await accountView({
                  args: { account: accountName },
                  api: coreApi,
                });
                const balance = (viewAccountResult.result as AccountViewOutput)
                  .balance;
                if (balance > 0n) {
                  await hbarTransfer({
                    args: {
                      amount: String(Number(balance) / 100000000),
                      to: 'main-account',
                      from: accountName,
                    },
                    api: coreApi,
                  });
                  refundedCount += 1;
                }
                return { accountName, failure: undefined };
              } catch (error) {
                return { accountName, failure: describeFailure(error) };
              }
            }),
          );

          for (const outcome of outcomes) {
            if (outcome.failure === undefined) {
              pendingAccounts.delete(outcome.accountName);
              refundFailures.delete(outcome.accountName);
            } else {
              refundFailures.set(outcome.accountName, outcome.failure);
            }
          }

          const mainView = await accountView({
            args: { account: 'main-account' },
            api: coreApi,
          });
          return (mainView.result as AccountViewOutput).balance;
        },
        (mainAccountBalance) =>
          pendingAccounts.size === 0 &&
          (refundedCount === 0 ||
            mainAccountBalanceBefore === undefined ||
            mainAccountBalance > mainAccountBalanceBefore),
        // A receipt only proves consensus accepted the transfers: the mirror
        // still needs a moment to report both a freshly created account and
        // the refunded balance, which is the one thing worth waiting for.
        { timeout: 15000, interval: 1000 },
      );
    } catch (error) {
      const pendingSummary = [...pendingAccounts]
        .map(
          (accountName) =>
            `${accountName}: ${refundFailures.get(accountName) ?? 'unknown'}`,
        )
        .join('; ');
      console.warn(
        `Teardown: refund confirmation timed out after 15000ms (refunded ${refundedCount}, ${
          pendingSummary
            ? `still pending: ${pendingSummary}`
            : 'main-account balance never grew'
        }) — ${describeFailure(error)}`,
      );
    }
  } catch (error) {
    console.warn(`Teardown: fund return skipped — ${describeFailure(error)}`);
  }
};
