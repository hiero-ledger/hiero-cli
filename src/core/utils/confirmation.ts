import * as clack from '@clack/prompts';

function handleCancel(result: unknown): void {
  if (clack.isCancel(result)) {
    clack.cancel('Operation cancelled.');
    process.exit(0);
  }
}

/**
 * Displays confirmation prompt to user.
 * @returns true if confirmed, false if declined
 * @throws process.exit(0) if cancelled (Ctrl+C)
 */
export async function requireConfirmation(message: string): Promise<boolean> {
  const confirmed = await clack.confirm({
    message,
    initialValue: false,
  });

  handleCancel(confirmed);

  return confirmed as boolean;
}
