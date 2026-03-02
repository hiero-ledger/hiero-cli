import { InternalError } from '@/core';

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  {
    timeout = 30000,
    interval = 3000,
  }: { timeout?: number; interval?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (condition(result)) return result;
    await delay(interval);
  }
  throw new InternalError(`waitFor timed out after ${timeout}ms`);
}
